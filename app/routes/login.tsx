import * as React from "react";
import {
  data,
  Form,
  redirect,
  useNavigation,
  useSearchParams,
} from "react-router";
import { z } from "zod";
import type { Route } from "./+types/login";

import Button from "~/components/button";
import { ErrorMessage } from "~/components/error";
import Input from "~/components/input";
import Link from "~/components/link";
import Main from "~/components/main";
import ShowPasswordButton from "~/components/show-password-button";
import {
  createAuthSession,
  getValidAuthSession,
  signInWithEmail,
} from "~/models/auth";
import {
  assertIsPost,
  getRedirectTo,
  parseFormData,
} from "~/utils/http.server";

const formSchema = z.object({ email: z.string(), password: z.string() });

export const meta: Route.MetaFunction = () => [{ title: "Login" }];

export async function loader({ request }: Route.LoaderArgs) {
  const authSession = await getValidAuthSession(request);

  if (authSession) throw redirect(getRedirectTo(request));

  return null;
}

export async function action({ request }: Route.ActionArgs) {
  assertIsPost(request);
  const formData = await request.formData();
  const { email, password } = parseFormData(formData, formSchema);

  try {
    const authSession = await signInWithEmail(email, password);

    if (!authSession) {
      return data({ error: "Invalid email or password" }, { status: 400 });
    }

    return createAuthSession({
      request,
      authSession,
      redirectTo: getRedirectTo(request),
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return data({ error: error.message }, { status: 500 });
    }
    console.error(error);
    return data({ error: "Unknown error" }, { status: 500 });
  }
}

export default function Login({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const disabled = navigation.state !== "idle";

  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "";
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="max-w-full grow">
      <Main>
        <h1 className="mb-4 text-2xl font-semibold">Log in</h1>
        <p className="mb-4">
          Log in to upload unlisted or private games, edit games, or delete
          games.
        </p>
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
                disabled={disabled}
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
                disabled={disabled}
                placeholder="Password"
                required
              />
              <ShowPasswordButton
                showPassword={showPassword}
                onClick={() => setShowPassword((s) => !s)}
              />
            </div>
          </div>
          <Button type="primary" htmlType="submit" disabled={disabled}>
            Log in
          </Button>
          {actionData?.error ? (
            <ErrorMessage>{actionData?.error}</ErrorMessage>
          ) : null}
          <hr className="my-4" />
          <p>
            Don't have an account?{" "}
            <Link
              to={`/signup${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
            >
              Sign up
            </Link>
          </p>
        </Form>
      </Main>
    </div>
  );
}
