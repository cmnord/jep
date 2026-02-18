import * as React from "react";
import { data, Form, redirect, useNavigation } from "react-router";
import { z } from "zod";

import Button from "~/components/button";
import { ErrorMessage, SuccessMessage } from "~/components/error";
import Input from "~/components/input";
import Link from "~/components/link";
import Main from "~/components/main";
import ShowPasswordButton from "~/components/show-password-button";
import {
  createAuthSession,
  exchangeOAuthCode,
  getValidAuthSession,
  updateAuthPassword,
} from "~/models/auth";
import { assertIsPost, parseFormData } from "~/utils/http.server";

import type { Route } from "./+types/reset-password";

const formSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
});

export const meta: Route.MetaFunction = () => [{ title: "Reset password" }];

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  // PKCE flow: Supabase redirected with a ?code param. Exchange it for a
  // session cookie and redirect back to this page with a clean URL.
  if (code) {
    const authSession = await exchangeOAuthCode(code);
    if (authSession) {
      return createAuthSession({
        request,
        authSession,
        redirectTo: "/reset-password",
      });
    }
    throw redirect("/forgot-password");
  }

  return null;
}

export async function action({ request }: Route.ActionArgs) {
  assertIsPost(request);

  const formData = await request.formData();
  const { newPassword, confirmPassword, accessToken, refreshToken } =
    parseFormData(formData, formSchema);

  if (newPassword !== confirmPassword) {
    return data(
      { error: "Passwords do not match", ok: false },
      { status: 400 },
    );
  }

  // Prefer session from cookie (PKCE flow). Fall back to tokens submitted
  // from the client via hidden fields (implicit flow).
  const authSession = await getValidAuthSession(request);
  const effectiveAccessToken = authSession?.accessToken ?? accessToken;
  const effectiveRefreshToken = authSession?.refreshToken ?? refreshToken;

  if (!effectiveAccessToken || !effectiveRefreshToken) {
    return data(
      {
        error:
          "Reset link is invalid or expired. Request a new password reset link.",
        ok: false,
      },
      { status: 401 },
    );
  }

  try {
    await updateAuthPassword(
      effectiveAccessToken,
      newPassword,
      effectiveRefreshToken,
    );
    return data({ error: null, ok: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to reset password";
    return data({ error: message, ok: false }, { status: 500 });
  }
}

export default function ResetPassword({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const disabled = navigation.state !== "idle";
  const [showPassword, setShowPassword] = React.useState(false);
  const [accessToken, setAccessToken] = React.useState<string | undefined>();
  const [refreshToken, setRefreshToken] = React.useState<string | undefined>();

  // Implicit flow: Supabase redirected with tokens in the URL hash fragment.
  // Extract them client-side (hash fragments are not sent to the server).
  React.useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const token = hash.get("access_token") ?? undefined;
    const refresh = hash.get("refresh_token") ?? undefined;
    setAccessToken(token);
    setRefreshToken(refresh);

    if (token) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <div className="max-w-full grow">
      <Main>
        <h1 className="mb-4 text-2xl font-semibold">Reset password</h1>
        {actionData?.ok ? (
          <>
            <SuccessMessage>
              Your password has been reset successfully.
            </SuccessMessage>
            <p className="mt-4">
              <Link to="/profile">Go to profile</Link>
            </p>
          </>
        ) : (
          <>
            <p className="mb-4">Enter your new password below.</p>
            <Form method="POST" className="flex flex-col gap-4">
              {accessToken ? (
                <input type="hidden" name="accessToken" value={accessToken} />
              ) : null}
              {refreshToken ? (
                <input type="hidden" name="refreshToken" value={refreshToken} />
              ) : null}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  New password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="newPassword"
                    id="newPassword"
                    autoComplete="new-password"
                    autoFocus
                    disabled={disabled}
                    minLength={6}
                    placeholder="New password"
                    required
                  />
                  <ShowPasswordButton
                    showPassword={showPassword}
                    onClick={() => setShowPassword((s) => !s)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  Confirm new password
                </label>
                <Input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  id="confirmPassword"
                  autoComplete="new-password"
                  disabled={disabled}
                  minLength={6}
                  placeholder="Confirm password"
                  required
                />
              </div>
              <Button type="primary" htmlType="submit" disabled={disabled}>
                Reset password
              </Button>
              {actionData?.error ? (
                <ErrorMessage>{actionData.error}</ErrorMessage>
              ) : null}
            </Form>
          </>
        )}
      </Main>
    </div>
  );
}
