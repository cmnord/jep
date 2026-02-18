import { data, Form, useNavigation } from "react-router";
import { z } from "zod";

import Button from "~/components/button";
import { SuccessMessage } from "~/components/error";
import Input from "~/components/input";
import Link from "~/components/link";
import Main from "~/components/main";
import { sendPasswordResetEmail } from "~/models/auth";
import { BASE_URL } from "~/utils";
import { assertIsPost, parseFormData } from "~/utils/http.server";

import type { Route } from "./+types/forgot-password";

const formSchema = z.object({ email: z.string().email() });

export const meta: Route.MetaFunction = () => [{ title: "Forgot password" }];

export async function action({ request }: Route.ActionArgs) {
  assertIsPost(request);
  const formData = await request.formData();
  const { email } = parseFormData(formData, formSchema);

  // Always show success to prevent email enumeration.
  try {
    await sendPasswordResetEmail(email, BASE_URL + "/reset-password");
  } catch {
    // Silently ignore errors to prevent email enumeration.
  }

  return data({ sent: true });
}

export default function ForgotPassword({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const disabled = navigation.state !== "idle";

  return (
    <div className="max-w-full grow">
      <Main>
        <h1 className="mb-4 text-2xl font-semibold">Forgot password</h1>
        <p className="mb-4">
          Enter your email address and we'll send you a link to reset your
          password.
        </p>
        {actionData?.sent ? (
          <>
            <SuccessMessage>
              If an account exists for that email, you'll receive a password
              reset link shortly.
            </SuccessMessage>
            <p className="mt-4">
              <Link to="/login">Back to login</Link>
            </p>
          </>
        ) : (
          <Form method="POST" className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
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
            <Button type="primary" htmlType="submit" disabled={disabled}>
              Send reset link
            </Button>
            <p>
              <Link to="/login">Back to login</Link>
            </p>
          </Form>
        )}
      </Main>
    </div>
  );
}
