import type { ActionArgs, V2_MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";

import Button from "~/components/button";
import { ErrorMessage } from "~/components/error";
import Input from "~/components/input";
import Link from "~/components/link";

export const meta: V2_MetaFunction = () => [{ title: "Login" }];

export async function loader() {
  // TODO: if already logged in, redirect to `/`
  return null;
}

export async function action({ request }: ActionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // TODO: log in user
  return json({ error: "Not implemented" }, { status: 500 });
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const disabled = navigation.state !== "idle";

  return (
    <div className="max-w-full grow">
      <main className="mx-auto max-w-screen-md px-4 pb-16 pt-8 md:pt-16">
        <h2 className="mb-4 text-2xl font-semibold">Log in</h2>
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
          <Button type="primary" htmlType="submit" disabled={disabled}>
            Log in
          </Button>
          {actionData?.error ? (
            <ErrorMessage message={actionData.error} />
          ) : null}
          <hr className="my-4" />
          <p>
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </Form>
      </main>
    </div>
  );
}
