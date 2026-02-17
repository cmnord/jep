import { randomUUID } from "node:crypto";

import { createCookieSessionStorage } from "react-router";
import { z } from "zod";

import { NODE_ENV, SESSION_SECRET } from "~/utils";

const FormStateSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
type FormState = z.infer<typeof FormStateSchema>;

const FORM_STATE_KEY = "formState";
const USER_SESSION_KEY = "userId";

const { getSession, commitSession } = createCookieSessionStorage({
  cookie: {
    name: "__session",

    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [SESSION_SECRET],
    secure: NODE_ENV === "production",
  },
});

/** getSessionFormState appends to existing headers if provided. */
export async function getSessionFormState(
  request: Request,
  headers = new Headers(),
): Promise<[FormState | undefined, Headers]> {
  const session = await getSession(request.headers.get("Cookie"));
  const data = session.get("formState");
  headers.append("Set-Cookie", await commitSession(session));
  if (!data) {
    return [undefined, headers];
  }
  return [FormStateSchema.parse(JSON.parse(data)), headers];
}

/** flashFormState appends to existing headers if provided. */
export async function flashFormState(
  request: Request,
  data: FormState,
  headers = new Headers(),
): Promise<Headers> {
  const session = await getSession(request.headers.get("Cookie"));
  session.flash(FORM_STATE_KEY, JSON.stringify(data));
  headers.append("Set-Cookie", await commitSession(session));
  return headers;
}

export async function getUserSession(request: Request) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get(USER_SESSION_KEY);
  if (typeof userId === "string") {
    return userId;
  }
  return null;
}

/**
 * Validates that the claimed userId from form data matches the authenticated
 * session. Throws a 403 Response if they don't match, preventing impersonation.
 */
export async function requireSessionUserId(
  request: Request,
  claimedUserId: string,
  authSession: { userId: string } | null,
): Promise<void> {
  const sessionUserId = authSession?.userId ?? (await getUserSession(request));
  if (sessionUserId !== claimedUserId) {
    throw new Response("userId does not match session", { status: 403 });
  }
}

/** createUserSession appends to existing headers if provided. */
async function createUserSession(
  request: Request,
  userId: string,
  headers = new Headers(),
) {
  const session = await getSession(request.headers.get("Cookie"));
  session.set(USER_SESSION_KEY, userId);
  headers.append("Set-Cookie", await commitSession(session));
  return headers;
}

/** getOrCreateUserSession appends to existing headers if provided. */
export async function getOrCreateUserSession(
  request: Request,
  headers = new Headers(),
) {
  let userId = await getUserSession(request);
  if (!userId) {
    userId = randomUUID();
    await createUserSession(request, userId, headers);
  }
  return userId;
}
