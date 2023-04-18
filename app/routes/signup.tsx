import type { ActionArgs, LoaderArgs, V2_MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";

import Button from "~/components/button";
import { ErrorMessage } from "~/components/error";
import Input from "~/components/input";
import Link from "~/components/link";
import { createAuthSession, getAuthSession } from "~/models/auth";
import {
  createUserAccount,
  getUserByEmail,
} from "~/models/user/service.server";

export const meta: V2_MetaFunction = () => [{ title: "Sign up" }];

export async function loader({ request }: LoaderArgs) {
  const authSession = await getAuthSession(request);

  if (authSession) return redirect("/");

  return null;
}

export async function action({ request }: ActionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  if (password !== confirmPassword) {
    return json({ error: "Passwords do not match" }, { status: 400 });
  }
  if (password.length < 6) {
    return json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const existingUser = await getUserByEmail(email);

  if (existingUser) {
    return json({ error: "User already exists" }, { status: 400 });
  }

  const authSession = await createUserAccount(email, password);

  if (!authSession) {
    return json({ error: "Unable to create account" }, { status: 500 });
  }

  return createAuthSession({
    request,
    authSession,
    redirectTo: "/",
  });
}

export default function Signup() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const disabled = navigation.state !== "idle";

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
            <div>
              <Input
                type="password"
                name="password"
                id="password"
                autoComplete="current-password"
                disabled={disabled}
                placeholder="Password"
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700"
            >
              Confirm Password
            </label>
            <div>
              <Input
                type="password"
                name="confirmPassword"
                id="confirmPassword"
                autoComplete="current-password"
                disabled={disabled}
                placeholder="Confirm Password"
                required
              />
            </div>
          </div>
          <Button type="primary" htmlType="submit" disabled={disabled}>
            Sign up
          </Button>
          {actionData?.error ? (
            <ErrorMessage message={actionData.error} />
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
