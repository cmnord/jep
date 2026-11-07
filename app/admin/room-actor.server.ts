import { hasHostSeatEvents } from "~/engine/room-event";
import type { State } from "~/engine/state";
import type { createT } from "~/i18n";
import type { AuthSession } from "~/models/auth";
import { getRoomEvents } from "~/models/room-event.server";
import { getRoomState } from "~/models/room-state.server";
import { getRoom } from "~/models/room.server";
import { requireSessionUserId } from "~/session.server";

import { getAdmin } from "./auth.server";

/** The form field the room's admin panel sets ("true") when the site admin
 * does a player's step for them (act for a player). */
export const ACT_AS_ADMIN_FIELD = "admin";

/** The form field the host's controls set ("true") when the room's host
 * judges an answer or does a player's step for them (feature 22). */
export const ACT_AS_HOST_FIELD = "host";

/** RoomActorTag is spread into an event payload: `{ admin: true }` for an
 * admin intervention, `{ host: true }` for the room's host, nothing when the
 * visitor acts for themselves. */
export type RoomActorTag = { admin?: true; host?: true };

type Room = { id: number; game_id: string };
type Session = Pick<AuthSession, "userId" | "accessToken"> | null;

/** requireRoomHost checks that the visitor holds the room's host seat (403
 * otherwise) and returns the replayed room state. */
export async function requireRoomHost(
  request: Request,
  room: Room,
  authSession: Session,
  t: ReturnType<typeof createT>,
): Promise<{ state: State }> {
  const { state } = await getRoomState(room, authSession, t);
  if (!state.host) {
    throw new Response(t("room.error.hostOnly"), { status: 403 });
  }
  try {
    await requireSessionUserId(request, state.host.userId, authSession);
  } catch {
    throw new Response(t("room.error.hostOnly"), { status: 403 });
  }
  return { state };
}

/** isRoomHost is true when the visitor holds the host seat of `state`. */
export async function isRoomHost(
  request: Request,
  state: Pick<State, "host">,
  authSession: Session,
) {
  if (!state.host) return false;
  try {
    await requireSessionUserId(request, state.host.userId, authSession);
    return true;
  } catch {
    return false;
  }
}

/** authorizeRoomActor checks who may send a room action for `userId` and
 * returns how to tag the event.
 *
 * - A normal request (no `admin` / `host` field): the visitor may only act
 *   as themselves (requireSessionUserId, 403 otherwise).
 * - An admin intervention (`admin=true`): the visitor must have a valid admin
 *   session (403 otherwise) and may then act for any player — they needn't
 *   play in the room. The route tags the event `admin: true`; the engine
 *   still applies every game rule (whose turn it is, …) exactly as if the
 *   player had done it.
 * - The room's host (`host=true`, feature 22): the visitor must hold the host
 *   seat of room `roomId` (403 otherwise); the event is tagged `host: true`
 *   (the host judges answers and has the admin's room controls).
 *
 * The event is then inserted by the server (createRoomEventAsServer): the
 * browser key may not insert room events at all, so this check can't be
 * skipped by writing to the table directly. */
export async function authorizeRoomActor(
  request: Request,
  formData: FormData,
  userId: string,
  authSession: Session,
  t: ReturnType<typeof createT>,
  roomId?: number,
): Promise<RoomActorTag> {
  if (formData.get(ACT_AS_ADMIN_FIELD) === "true") {
    if (!(await getAdmin(request))) {
      throw new Response(t("room.error.adminOnly"), { status: 403 });
    }
    return { admin: true };
  }
  if (formData.get(ACT_AS_HOST_FIELD) === "true") {
    const room =
      roomId !== undefined
        ? await getRoom(roomId, authSession?.accessToken)
        : null;
    if (!room) {
      throw new Response(t("room.error.roomNotFound"), { status: 404 });
    }
    await requireRoomHost(request, room, authSession, t);
    return { host: true };
  }
  await requireSessionUserId(request, userId, authSession);
  return {};
}

/** requireHostModeFlow: in host mode only the host (as themselves) or an
 * admin / host intervention starts rounds and moves on from a question (403
 * otherwise; the engine ignores such events too). Rooms that never had a host
 * are not replayed. */
export async function requireHostModeFlow(
  room: Room,
  userId: string,
  actor: RoomActorTag,
  authSession: Session,
  t: ReturnType<typeof createT>,
) {
  if (actor.admin || actor.host) return;
  const events = await getRoomEvents(room.id, authSession?.accessToken);
  if (!hasHostSeatEvents(events)) return;
  const { state } = await getRoomState(room, authSession, t);
  if (state.host && state.host.userId !== userId) {
    throw new Response(t("room.error.hostRunsGame"), { status: 403 });
  }
}
