import { createCookieSessionStorage } from "@remix-run/node";

interface FormState {
  success: boolean;
  error: string;
}

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("process.env.SESSION_SECRET not found");
}

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
  return [JSON.parse(data), headers];
}

export async function flashFormState(
  request: Request,
  data: FormState,
  headers = new Headers()
): Promise<Headers> {
  const session = await getSession(request.headers.get("Cookie"));
  session.flash("formState", JSON.stringify(data));
  headers.append("Set-Cookie", await commitSession(session));
  return headers;
}
