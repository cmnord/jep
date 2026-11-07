import { data } from "react-router";
import { z } from "zod";

import { getAdmin } from "~/admin/auth.server";
import {
  ACT_AS_HOST_FIELD,
  requireRoomHost,
  type RoomActorTag,
} from "~/admin/room-actor.server";
import { ActionType } from "~/engine";
import { MAX_ADMIN_SCORE } from "~/engine/actions";
import { canSkipClue } from "~/engine/admin";
import { GameState } from "~/engine/state";
import { createT, getRequestLocale } from "~/i18n";
import { getValidAuthSession } from "~/models/auth";
import { createRoomEventAsServer } from "~/models/room-event.server";
import { revealResolvedAnswer } from "~/models/room-reveal.server";
import { getRoomState } from "~/models/room-state.server";
import { getRoom } from "~/models/room.server";
import { parseFormData } from "~/utils/http.server";

import type { Route } from "./+types/room.$roomId.admin";

const formSchema = z.discriminatedUnion("intent", [
  /** Skip the open question, or an unplayed question on the board. */
  z.object({
    intent: z.literal("skip"),
    i: z.coerce.number().int(),
    j: z.coerce.number().int(),
  }),
  /** Add / subtract `amount` to a player's score, or set it to `amount`. */
  z.object({
    intent: z.literal("score"),
    userId: z.string().min(1),
    op: z.enum(["add", "subtract", "set"]),
    /** A whole number (no empty field: that isn't 0). */
    amount: z
      .string()
      .trim()
      .regex(/^-?\d+$/)
      .transform(Number)
      .pipe(z.number().int().min(-MAX_ADMIN_SCORE).max(MAX_ADMIN_SCORE)),
  }),
]);

export type AdminRoomActionData = { error: string } | null;

/** The site admin's own interventions in a room (feature 20): skip a
 * question and change scores. The room's host may do the same (`host=true`,
 * feature 22). (Doing a stuck player's step for them goes
 * through that step's own route with `admin=true`, see
 * authorizeRoomActor.)
 *
 * Only with a valid admin session (403 otherwise); the admin needn't play in
 * the room. The event is inserted with the service role, tagged `admin:
 * true`; the browser key can't insert room events at all. Things that can
 * change between the admin's click and the request (the question moved on,
 * the player left) answer with an error message instead of throwing, so the
 * room page shows it in the panel. Solo play has no admin. */
export async function action({ request, params }: Route.ActionArgs) {
  const t = createT(getRequestLocale(request));
  const formData = await request.formData();
  // The room's host has the same controls (feature 22), checked against the
  // room below; everyone else needs an admin session, checked first.
  const asHost = formData.get(ACT_AS_HOST_FIELD) === "true";
  if (!asHost && !(await getAdmin(request))) {
    throw new Response(t("room.error.adminOnly"), { status: 403 });
  }

  const roomId = params.roomId ? parseInt(params.roomId) : undefined;
  if (!roomId) {
    throw new Response(t("room.error.noRoomInUrl"), { status: 404 });
  }
  if (roomId === -1) {
    throw new Response(t("room.error.adminRoomsOnly"), { status: 400 });
  }

  const form = parseFormData(formData, formSchema);

  const authSession = await getValidAuthSession(request);
  const room = await getRoom(roomId, authSession?.accessToken);
  if (!room) {
    throw new Response(t("room.error.roomNotFound"), { status: 404 });
  }
  const { state } = asHost
    ? await requireRoomHost(request, room, authSession, t)
    : await getRoomState(room, authSession, t);
  const tag: RoomActorTag = asHost ? { host: true } : { admin: true };
  if (state.type === GameState.GameOver) {
    return data({ error: t("room.error.gameIsOver") }, { status: 409 });
  }

  if (form.intent === "skip") {
    const { i, j } = form;
    if (!canSkipClue(state, i, j)) {
      return data(
        { error: t("room.error.adminNothingToSkip") },
        { status: 409 },
      );
    }
    await createRoomEventAsServer(room.id, ActionType.SkipClue, {
      i,
      j,
      ...tag,
    });
    await revealResolvedAnswer(room, authSession);
    return null;
  }

  const { userId, op, amount } = form;
  const player = state.players.get(userId) ?? state.leftPlayers.get(userId);
  if (!player) {
    return data({ error: t("room.error.adminNotAPlayer") }, { status: 409 });
  }
  const change =
    op === "set"
      ? { score: amount }
      : { delta: op === "add" ? amount : -amount };
  // Nothing changes: nothing to store.
  if ("delta" in change ? change.delta === 0 : player.score === amount) {
    return null;
  }
  await createRoomEventAsServer(room.id, ActionType.AdjustScore, {
    userId,
    ...change,
    ...tag,
  });
  return null;
}
