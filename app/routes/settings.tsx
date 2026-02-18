import * as React from "react";
import { data, Form, redirect, useFetcher } from "react-router";

import Button from "~/components/button";
import { ErrorMessage, SuccessMessage } from "~/components/error";
import Input from "~/components/input";
import Link from "~/components/link";
import Main from "~/components/main";
import ShowPasswordButton from "~/components/show-password-button";
import { getAuthAccountByAccessToken, requireAuthSession } from "~/models/auth";
import {
  parseUserSettings,
  updateUserSettings,
} from "~/models/user-settings.server";
import { getUserByEmail } from "~/models/user/service.server";

import type { Route } from "./+types/settings";

export const meta: Route.MetaFunction = () => [{ title: "Settings" }];

export async function action({ request }: Route.ActionArgs) {
  const authSession = await requireAuthSession(request);
  const settings = parseUserSettings(await request.json());

  await updateUserSettings(
    authSession.userId,
    settings,
    authSession.accessToken,
  );

  return Response.json({ ok: true });
}

export async function loader({ request }: Route.LoaderArgs) {
  const authSession = await requireAuthSession(request);

  if (!authSession) {
    throw redirect("/login");
  }

  const user = await getUserByEmail(authSession.email, authSession.accessToken);
  const authUser = await getAuthAccountByAccessToken(authSession.accessToken);
  const hasPassword =
    authUser.identities?.some((i) => i.provider === "email") ?? false;

  return data({
    user,
    hasPassword,
  });
}

function SettingsSection({
  title,
  tone = "default",
  children,
}: {
  title: string;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  const toneClasses =
    tone === "danger"
      ? "border-red-300 bg-red-50/40"
      : "border-slate-200 bg-white shadow-sm";

  return (
    <section className={`rounded-lg border p-5 ${toneClasses}`}>
      <h2
        className={
          tone === "danger"
            ? "mb-4 text-xl font-semibold text-red-700"
            : "mb-4 text-xl font-semibold text-slate-900"
        }
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const fetcher = useFetcher<{ error: string | null; ok: boolean }>();
  const [showPassword, setShowPassword] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement | null>(null);

  const isSubmitting = fetcher.state !== "idle";
  const success = fetcher.data?.ok === true;

  React.useEffect(() => {
    if (success) {
      formRef.current?.reset();
    }
  }, [success]);

  return (
    <fetcher.Form
      ref={formRef}
      method="POST"
      action="/account/change-password"
      className="flex flex-col gap-4"
    >
      {hasPassword && (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="currentPassword"
            className="text-sm font-medium text-slate-700"
          >
            Current password
          </label>
          <div className="relative">
            <Input
              id="currentPassword"
              name="currentPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              disabled={isSubmitting}
              required
            />
            <ShowPasswordButton
              showPassword={showPassword}
              onClick={() => setShowPassword((s) => !s)}
            />
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="newPassword"
          className="text-sm font-medium text-slate-700"
        >
          New password
        </label>
        <div className="relative">
          <Input
            id="newPassword"
            name="newPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={6}
            disabled={isSubmitting}
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
          className="text-sm font-medium text-slate-700"
        >
          Confirm new password
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          minLength={6}
          disabled={isSubmitting}
          required
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button type="primary" htmlType="submit" disabled={isSubmitting}>
          {hasPassword ? "Change password" : "Set password"}
        </Button>
        {success && <SuccessMessage>Password updated.</SuccessMessage>}
        {fetcher.data?.error && (
          <ErrorMessage>{fetcher.data.error}</ErrorMessage>
        )}
      </div>
    </fetcher.Form>
  );
}

function ChangeEmailForm({ email }: { email?: string }) {
  const fetcher = useFetcher<{ error: string | null; ok: boolean }>();
  const formRef = React.useRef<HTMLFormElement | null>(null);

  const isSubmitting = fetcher.state !== "idle";
  const success = fetcher.data?.ok === true;

  React.useEffect(() => {
    if (success) {
      formRef.current?.reset();
    }
  }, [success]);

  return (
    <fetcher.Form
      ref={formRef}
      method="POST"
      action="/account/change-email"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-700">
          Current email
        </label>
        <p className="text-sm text-slate-500">{email}</p>
      </div>
      <div className="flex flex-col gap-2">
        <label
          htmlFor="newEmail"
          className="text-sm font-medium text-slate-700"
        >
          New email
        </label>
        <Input
          id="newEmail"
          name="newEmail"
          type="email"
          autoComplete="email"
          disabled={isSubmitting}
          required
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button type="primary" htmlType="submit" disabled={isSubmitting}>
          Change email
        </Button>
        {success && (
          <SuccessMessage>Confirmation email(s) sent.</SuccessMessage>
        )}
        {fetcher.data?.error && (
          <ErrorMessage>{fetcher.data.error}</ErrorMessage>
        )}
      </div>
    </fetcher.Form>
  );
}

export default function Settings({ loaderData }: Route.ComponentProps) {
  const dangerZoneFetcher = useFetcher<{ error: string | null; ok: boolean }>();
  const [deleteConfirmation, setDeleteConfirmation] = React.useState("");

  const email = loaderData.user?.email ?? "";
  const isDeleting = dangerZoneFetcher.state !== "idle";
  const canDelete = deleteConfirmation === email;

  return (
    <div className="max-w-full grow">
      <Main>
        <h1 className="mb-4 text-2xl font-semibold text-slate-900">
          Account settings
        </h1>
        <p className="mb-8 text-sm text-slate-500">
          <Link to="/profile">&larr; Back to profile</Link>
        </p>

        <div className="flex flex-col gap-6">
          <SettingsSection title="Change email">
            <ChangeEmailForm email={loaderData.user?.email} />
          </SettingsSection>

          <SettingsSection title="Change password">
            <ChangePasswordForm hasPassword={loaderData.hasPassword} />
          </SettingsSection>

          <Form method="POST" action="/logout">
            <Button type="default" htmlType="submit">
              Log out
            </Button>
          </Form>

          <SettingsSection title="Danger zone" tone="danger">
            <p className="mb-4 text-sm text-red-900/80">
              Permanently delete your account and all associated data, including
              your uploaded games, solve history, and reports.
            </p>
            <dangerZoneFetcher.Form
              method="POST"
              action="/account/delete"
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="deleteConfirmation"
                  className="text-sm font-medium text-slate-700"
                >
                  Type your email to confirm
                </label>
                <Input
                  id="deleteConfirmation"
                  name="confirmation"
                  type="text"
                  autoComplete="off"
                  placeholder={email}
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  disabled={isDeleting}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button
                  type="danger"
                  htmlType="submit"
                  disabled={!canDelete || isDeleting}
                >
                  Delete account
                </Button>
                {dangerZoneFetcher.data?.error && (
                  <ErrorMessage>{dangerZoneFetcher.data.error}</ErrorMessage>
                )}
              </div>
            </dangerZoneFetcher.Form>
          </SettingsSection>
        </div>
      </Main>
    </div>
  );
}
