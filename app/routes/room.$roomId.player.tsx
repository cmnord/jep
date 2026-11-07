import { getAdmin } from "~/admin/auth.server";
import { ActionType, isGameUnderway } from "~/engine";
import { PlayerFormPayload } from "~/engine/actions";
import { applyRoomEventsToState } from "~/engine/room-event";
import { GameState, stateFromGame } from "~/engine/state";
import { createT, getRequestLocale } from "~/i18n";
import { getValidAuthSession } from "~/models/auth";
import { getGame } from "~/models/game.server";
import {
  createRoomEventAsServer,
  getRoomEvents,
} from "~/models/room-event.server";
import { getRoomState } from "~/models/room-state.server";
import { getRoom } from "~/models/room.server";
import { getSolve, markAttempted } from "~/models/solves.server";
import { getUserSession, requireSessionUserId } from "~/session.server";
import { parseFormData } from "~/utils/http.server";

import type { Route } from "./+types/room.$roomId.player";

/** The visitor's own userId: Supabase auth first, then the guest cookie. */
async function getCurrentUserId(
  request: Request,
  authSession: Awaited<ReturnType<typeof getValidAuthSession>>,
) {
  return authSession?.userId ?? (await getUserSession(request));
}

export async function action({ request, params }: Route.ActionArgs) {
  const t = createT(getRequestLocale(request));
  if (
    request.method !== "POST" &&
    request.method !== "PATCH" &&
    request.method !== "DELETE"
  ) {
    throw new Response(t("room.error.methodNotAllowed"), { status: 405 });
  }
  const formData = await request.formData();
  const { name, userId, color, avatar, team } = parseFormData(
    formData,
    PlayerFormPayload,
  );

  const roomId = params.roomId ? parseInt(params.roomId) : undefined;
  if (!roomId) {
    throw new Response(t("room.error.noRoomInUrl"), { status: 404 });
  }

  if (roomId === -1) {
    const type =
      request.method === "POST"
        ? ActionType.Join
        : request.method === "PATCH"
          ? ActionType.ChangeName
          : ActionType.Kick;
    return {
      type,
      payload: { userId, name, color, avatar, ...(team ? { team } : {}) },
      ts: Date.now(),
    };
  }

  const authSession = await getValidAuthSession(request);
  // Validate userId for self-actions (Join, ChangeName). DELETE is excluded
  // because it's either Leave (self) or Kick (cross-user), decided below.
  if (request.method === "POST" || request.method === "PATCH") {
    await requireSessionUserId(request, userId, authSession);
  }
  // DELETE is Leave when the visitor removes themselves, else Kick.
  const currentUserId =
    request.method === "DELETE"
      ? await getCurrentUserId(request, authSession)
      : undefined;
  const type =
    request.method === "POST"
      ? ActionType.Join
      : request.method === "PATCH"
        ? ActionType.ChangeName
        : currentUserId === userId
          ? ActionType.Leave
          : ActionType.Kick;
  const room = await getRoom(roomId, authSession?.accessToken);
  if (!room) {
    throw new Response(t("room.error.roomNotFound"), { status: 404 });
  }

  if (type === ActionType.Leave || type === ActionType.Kick) {
    // Seats change only through the server: the browser key may not insert
    // leave/kick events (RLS), so nobody can remove someone else by writing
    // to room_events directly.
    const byAdmin =
      type === ActionType.Kick &&
      (await checkKick(request, room, currentUserId, authSession, t));
    await createRoomEventAsServer(room.id, type, {
      userId,
      name,
      color,
      ...(byAdmin ? { admin: true } : {}),
    });
    return null;
  }

  if (request.method === "POST") {
    // The host doesn't play (feature 22): they free the seat first.
    const { state } = await getRoomState(room, authSession, t);
    if (state.host?.userId === userId) {
      throw new Response(t("room.error.joinWhileHosting"), { status: 409 });
    }
  }

  // Mark the game as started if it hasn't been already
  if (authSession && request.method === "POST") {
    const solve = await getSolve(
      authSession.userId,
      room.game_id,
      authSession.accessToken,
    );
    if (!solve) {
      await markAttempted(
        authSession.userId,
        room.game_id,
        room.id,
        authSession.accessToken,
      );
    }
  }

  // Join / ChangeName only for the visitor's own userId (checked above).
  await createRoomEventAsServer(room.id, type, {
    userId,
    name,
    color,
    ...(avatar !== undefined ? { avatar } : {}),
    // Only Join carries a team (changes go through /team).
    ...(team && request.method === "POST" ? { team } : {}),
  });

  return null;
}

/** checkKick decides whether the visitor may kick a player from the room
 * and returns true when they do it as the site admin. Before the game is
 * underway (see isGameUnderway) any player may kick another; once the first
 * question was opened only the admin may (between questions), so a player
 * who stepped away or lost their connection keeps their seat. */
async function checkKick(
  request: Request,
  room: { id: number; game_id: string },
  currentUserId: string | null | undefined,
  authSession: Awaited<ReturnType<typeof getValidAuthSession>>,
  t: ReturnType<typeof createT>,
): Promise<boolean> {
  const isAdmin = (await getAdmin(request)) !== null;
  const game = await getGame(room.game_id, authSession?.userId);
  if (!game) {
    throw new Response(t("room.error.gameNotFound"), { status: 404 });
  }
  const state = applyRoomEventsToState(
    stateFromGame(game),
    await getRoomEvents(room.id, authSession?.accessToken),
  );
  if (state.type === GameState.GameOver) {
    throw new Response(t("room.error.gameIsOver"), { status: 409 });
  }
  if (isAdmin) {
    if (state.activeClue !== null) {
      throw new Response(t("room.error.kickBetweenQuestions"), {
        status: 409,
      });
    }
    return true;
  }
  if (isGameUnderway(state)) {
    throw new Response(t("room.error.kickAdminOnly"), { status: 403 });
  }
  if (!currentUserId || !state.players.has(currentUserId)) {
    throw new Response(t("room.error.kickPlayersOnly"), { status: 403 });
  }
  return false;
}
