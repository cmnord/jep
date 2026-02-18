import { data } from "react-router";
import { z } from "zod";

import {
  getAuthAccountByAccessToken,
  requireAuthSession,
  signInWithEmail,
  updateAuthPassword,
} from "~/models/auth";
import { assertIsPost } from "~/utils/http.server";

import type { Route } from "./+types/account.change-password";

const formSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function action({ request }: Route.ActionArgs) {
  assertIsPost(request);
  const authSession = await requireAuthSession(request);
  if (!authSession) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const result = formSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return data(
      { error: result.error.issues[0].message, ok: false },
      { status: 400 },
    );
  }
  const { currentPassword, newPassword } = result.data;

  try {
    const authUser = await getAuthAccountByAccessToken(authSession.accessToken);
    const hasPassword =
      authUser.identities?.some((i) => i.provider === "email") ?? false;

    if (hasPassword) {
      if (!currentPassword) {
        return data(
          { error: "Current password is required", ok: false },
          { status: 400 },
        );
      }
      const verified = await signInWithEmail(
        authSession.email,
        currentPassword,
      );
      if (!verified) {
        return data(
          { error: "Current password is incorrect", ok: false },
          { status: 400 },
        );
      }
    }

    await updateAuthPassword(
      authSession.accessToken,
      newPassword,
      authSession.refreshToken,
    );
    return data({ error: null, ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update password";
    return data({ error: message, ok: false }, { status: 500 });
  }
}
