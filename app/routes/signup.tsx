import * as React from "react";
import {
  data,
  Form,
  redirect,
  useNavigation,
  useSearchParams,
} from "react-router";
import { z } from "zod";

import Button from "~/components/button";
import { ErrorMessage, SuccessMessage } from "~/components/error";
import Input from "~/components/input";
import Link from "~/components/link";
import Main from "~/components/main";
import OAuthButtons from "~/components/oauth-buttons";
import ShowPasswordButton from "~/components/show-password-button";
import { getValidAuthSession } from "~/models/auth";
import {
  createUserAccount,
  getUserExistsByEmailWithoutSession,
} from "~/models/user/service.server";
import { getRedirectTo, parseFormData } from "~/utils/http.server";

import type { Route } from "./+types/signup";

const formSchema = z.object({ email: z.string(), password: z.string() });

export const meta: Route.MetaFunction = () => [{ title: "Sign up" }];

export async function loader({ request }: Route.LoaderArgs) {
  const authSession = await getValidAuthSession(request);

  if (authSession) throw redirect(getRedirectTo(request));

  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const { email, password } = parseFormData(formData, formSchema);
  if (password.length < 6) {
    return data(
      { success: false, message: "Password must be at least 6 characters" },
      { status: 400 },
    );
  }

  const userExists = await getUserExistsByEmailWithoutSession(email);
  if (userExists) {
    return data(
      {
        success: false,
        message: "User already exists with this email, sign in instead",
      },
      { status: 400 },
    );
  }

  try {
    await createUserAccount(email, password);
    return data({
      success: true,
      message:
        "Created user account! Check your email for a verification link.",
    });
  } catch (error: unknown) {
    console.error(error);
    if (error instanceof Error) {
      return data({ success: false, message: error.message }, { status: 500 });
    }
    throw error;
  }
}

export default function Signup({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const loading = navigation.state !== "idle";

  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "";
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="max-w-full grow">
      <Main>
        <h1 className="mb-4 text-2xl font-semibold">Sign up</h1>
        <p className="mb-4">
          Sign up to upload unlisted or private games, edit games, or delete
          games.
        </p>
        <OAuthButtons redirectTo={redirectTo} disabled={loading} />
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">or</span>
          </div>
        </div>
        <Form method="POST" className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <div>
              <Input
                type="email"
                name="email"
                id="email"
                aria-label="Email address"
                autoComplete="email"
                autoFocus
                disabled={loading}
                placeholder="Email"
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                name="password"
                id="password"
                autoComplete="current-password"
                disabled={loading}
                placeholder="Password"
                required
              />
              <ShowPasswordButton
                showPassword={showPassword}
                onClick={() => setShowPassword((s) => !s)}
              />
            </div>
          </div>
          <Button
            type="primary"
            htmlType="submit"
            disabled={loading}
            loading={loading}
          >
            Sign up
          </Button>
          {actionData ? (
            actionData?.success ? (
              <SuccessMessage>{actionData?.message}</SuccessMessage>
            ) : (
              <ErrorMessage>{actionData?.message}</ErrorMessage>
            )
          ) : null}
          <p>
            Have an account?{" "}
            <Link
              to={`/login${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
            >
              Log in
            </Link>
          </p>
        </Form>
      </Main>
    </div>
  );
}
