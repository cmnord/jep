import type { ActionArgs, LoaderArgs, V2_MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import * as React from "react";

import Button from "~/components/button";
import { ErrorMessage, SuccessMessage } from "~/components/error";
import Input from "~/components/input";
import Link from "~/components/link";
import ShowPasswordButton from "~/components/show-password-button";
import { getValidAuthSession } from "~/models/auth";
import {
  createUserAccount,
  getUserExistsByEmailWithoutSession,
} from "~/models/user/service.server";

export const meta: V2_MetaFunction = () => [{ title: "Sign up" }];

export async function loader({ request }: LoaderArgs) {
  const authSession = await getValidAuthSession(request);

  if (authSession) return redirect("/");

  return null;
}

export async function action({ request }: ActionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  if (password.length < 6) {
    return json(
      { success: false, message: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const userExists = await getUserExistsByEmailWithoutSession(email);
  if (userExists) {
    return json(
      {
        success: false,
        message: "User already exists with this email, sign in instead",
      },
      { status: 400 }
    );
  }

  try {
    await createUserAccount(email, password);
    return json({
      success: true,
      message:
        "Created user account! Check your email for a verification link.",
    });
  } catch (error: unknown) {
    console.error(error);
    if (error instanceof Error) {
      return json({ success: false, message: error.message }, { status: 500 });
    }
    throw error;
  }
}

export default function Signup() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const loading = navigation.state !== "idle";

  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="max-w-full grow">
      <main className="mx-auto max-w-screen-md px-4 pb-16 pt-8 md:pt-16">
        <h2 className="mb-4 text-2xl font-semibold">Sign up</h2>
        {/* TODO: explain what signing up is for */}
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
            actionData.success ? (
              <SuccessMessage message={actionData.message} />
            ) : (
              <ErrorMessage message={actionData.message} />
            )
          ) : null}
          <hr className="my-4" />
          <p>
            Have an account? <Link to="/login">Log in</Link>
          </p>
        </Form>
      </main>
    </div>
  );
}
