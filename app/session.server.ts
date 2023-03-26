import { createCookieSessionStorage } from "@remix-run/node";
import { nanoid } from "nanoid";

interface FormState {
  success: boolean;
  error: string;
}

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("process.env.SESSION_SECRET not found");
}

const FORM_STATE_KEY = "formState";
const USER_SESSION_KEY = "userId";

const { getSession, commitSession } = createCookieSessionStorage({
  cookie: {
    name: "__session",

    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [sessionSecret],
    secure: process.env.NODE_ENV === "production",
  },
});

/** getSessionFormState appends to existing headers if provided. */
export async function getSessionFormState(
  request: Request,
  headers = new Headers()
): Promise<[FormState, Headers]> {
  const session = await getSession(request.headers.get("Cookie"));
  const data = session.get("formState");
  headers.append("Set-Cookie", await commitSession(session));
  if (!data) {
    return [{ success: false, error: "" }, headers];
  }
  return [JSON.parse(data) as FormState, headers];
}

/** flashFormState appends to existing headers if provided. */
export async function flashFormState(
  request: Request,
  data: FormState,
  headers = new Headers()
): Promise<Headers> {
  const session = await getSession(request.headers.get("Cookie"));
  session.flash(FORM_STATE_KEY, JSON.stringify(data));
  headers.append("Set-Cookie", await commitSession(session));
  return headers;
}

async function getUserSession(request: Request) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get(USER_SESSION_KEY);
  if (typeof userId === "string") {
    return userId;
  }
  return null;
}

/** createUserSession appends to existing headers if provided. */
async function createUserSession(
  request: Request,
  userId: string,
  headers = new Headers()
) {
  const session = await getSession(request.headers.get("Cookie"));
  session.set(USER_SESSION_KEY, userId);
  headers.append("Set-Cookie", await commitSession(session));
  return headers;
}

/** getOrCreateUserSession appends to existing headers if provided. */
export async function getOrCreateUserSession(
  request: Request,
  headers = new Headers()
) {
  let userId = await getUserSession(request);
  if (!userId) {
    userId = nanoid();
    await createUserSession(request, userId, headers);
  }
  return userId;
}
