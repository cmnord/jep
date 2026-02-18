import { requireAuthSession } from "~/models/auth";
import {
  parseUserSettings,
  updateUserSettings,
} from "~/models/user-settings.server";

import type { Route } from "./+types/settings";

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
