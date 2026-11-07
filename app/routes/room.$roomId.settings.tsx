import { z } from "zod";

import { getAdmin } from "~/admin/auth.server";
import { ACT_AS_HOST_FIELD, isRoomHost } from "~/admin/room-actor.server";
import { ActionType } from "~/engine";
import { applyRoomEventsToState } from "~/engine/room-event";
import { GameState, stateFromGame } from "~/engine/state";
import { createT, getRequestLocale } from "~/i18n";
import { getValidAuthSession } from "~/models/auth";
import { getGame } from "~/models/game.server";
import {
  createRoomEventAsServer,
  getRoomEvents,
} from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";
import { requireSessionUserId } from "~/session.server";
import { parseFormData } from "~/utils/http.server";
import {
  roomSettingsFormSchema,
  toSettingsPayload,
} from "~/utils/room-timers-form";

import type { Route } from "./+types/room.$roomId.settings";

const formSchema = roomSettingsFormSchema.extend({
  /** The visitor changing the settings, only as themselves. */
  userId: z.string().min(1),
});

/** Changes the room settings (the answer timer and the room timers: reading
 * time, buzz window, Final answer and wager time). Last change wins.
 *
 * In a room only the site admin (a valid admin session, see /admin) may
 * change them, whether they play in the room or not — or the room's host
 * (`host=true`, feature 22). The event is inserted
 * with the service role: the browser key may not insert set_settings events
 * (RLS), so this check can't be skipped by writing to the table directly.
 * Solo play (roomId -1) has no room events: the player keeps the setting. */
export async function action({ request, params }: Route.ActionArgs) {
  const t = createT(getRequestLocale(request));
  const formData = await request.formData();
  const form = parseFormData(formData, formSchema);
  const payload = { userId: form.userId, ...toSettingsPayload(form) };

  const roomId = params.roomId ? parseInt(params.roomId) : undefined;
  if (!roomId) {
    throw new Response(t("room.error.noRoomInUrl"), { status: 404 });
  }

  if (roomId === -1) {
    return { type: ActionType.SetSettings, payload, ts: Date.now() };
  }

  // The room's host may change them too (feature 22), checked against the
  // room below; everyone else needs an admin session, checked first.
  const asHost = formData.get(ACT_AS_HOST_FIELD) === "true";
  if (!asHost && !(await getAdmin(request))) {
    throw new Response(t("room.error.settingsAdminOnly"), { status: 403 });
  }

  const authSession = await getValidAuthSession(request);
  await requireSessionUserId(request, form.userId, authSession);
  const room = await getRoom(roomId, authSession?.accessToken);
  if (!room) {
    throw new Response(t("room.error.roomNotFound"), { status: 404 });
  }

  // The engine ignores invalid changes on every client; checking here too
  // gives the player a clear error and keeps junk out of the room's events.
  const game = await getGame(room.game_id, authSession?.userId);
  if (!game) {
    throw new Response(t("room.error.gameNotFound"), { status: 404 });
  }
  const state = applyRoomEventsToState(
    stateFromGame(game),
    await getRoomEvents(room.id, authSession?.accessToken),
  );
  if (
    asHost &&
    (state.host?.userId !== form.userId ||
      !(await isRoomHost(request, state, authSession)))
  ) {
    throw new Response(t("room.error.hostOnly"), { status: 403 });
  }
  if (state.type === GameState.GameOver) {
    throw new Response(t("room.error.gameIsOver"), { status: 409 });
  }
  if (state.activeClue !== null) {
    throw new Response(t("room.error.settingsBetweenQuestions"), {
      status: 409,
    });
  }

  await createRoomEventAsServer(room.id, ActionType.SetSettings, {
    ...payload,
    ...(asHost ? { host: true } : { admin: true }),
  });

  return null;
}
