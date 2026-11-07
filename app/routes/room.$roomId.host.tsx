import { data } from "react-router";
import { z } from "zod";

import { getAdmin } from "~/admin/auth.server";
import { ActionType } from "~/engine";
import { GameState } from "~/engine/state";
import { createT, getRequestLocale } from "~/i18n";
import { getValidAuthSession } from "~/models/auth";
import { AvatarInput } from "~/models/avatar";
import { createRoomEventAsServer } from "~/models/room-event.server";
import { getRoomState } from "~/models/room-state.server";
import { getRoom } from "~/models/room.server";
import { requireSessionUserId } from "~/session.server";
import { parseFormData } from "~/utils/http.server";
import { getClueMedia, hasPlayableMedia } from "~/utils/media";

import type { Route } from "./+types/room.$roomId.host";

const SeatFields = {
  /** Who gets the seat. */
  userId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  avatar: AvatarInput.optional(),
};

const formSchema = z.discriminatedUnion("intent", [
  /** A visitor who doesn't play takes the free seat (as themselves). */
  z.object({ intent: z.literal("claim"), ...SeatFields }),
  /** The host (as themselves) or the admin frees the seat. */
  z.object({ intent: z.literal("release"), userId: z.string().min(1) }),
  /** The admin gives the seat to a visitor (or takes it). */
  z.object({ intent: z.literal("assign"), ...SeatFields }),
  /** The host (as themselves) or the admin replays the open question's
   * audio/video on every device (feature 23). */
  z.object({ intent: z.literal("replay"), userId: z.string().min(1) }),
]);

export type HostSeatActionData = { error: string } | null;

/** The host seat of a room (feature 22): claim the free seat, free it, or
 * (site admin) give it to someone; and the host's replay of a question's
 * audio/video (feature 23). The checks mirror the engine's, so a
 * request that would be ignored answers with a message instead (409); the
 * event is inserted with the service role (the browser key can't insert room
 * events). Solo play has no host. */
export async function action({ request, params }: Route.ActionArgs) {
  const t = createT(getRequestLocale(request));
  const roomId = params.roomId ? parseInt(params.roomId) : undefined;
  if (!roomId) {
    throw new Response(t("room.error.noRoomInUrl"), { status: 404 });
  }
  if (roomId === -1) {
    throw new Response(t("room.error.hostRoomsOnly"), { status: 400 });
  }

  const form = parseFormData(await request.formData(), formSchema);
  const isAdmin = (await getAdmin(request)) !== null;
  if (form.intent === "assign" && !isAdmin) {
    throw new Response(t("room.error.adminOnly"), { status: 403 });
  }

  const authSession = await getValidAuthSession(request);
  if (form.intent === "claim") {
    await requireSessionUserId(request, form.userId, authSession);
  }

  const room = await getRoom(roomId, authSession?.accessToken);
  if (!room) {
    throw new Response(t("room.error.roomNotFound"), { status: 404 });
  }
  const { state } = await getRoomState(room, authSession, t);
  const conflict = (message: string) =>
    data({ error: message }, { status: 409 });

  if (state.type === GameState.GameOver) {
    return conflict(t("room.error.gameIsOver"));
  }

  if (form.intent === "replay") {
    if (!isAdmin) {
      if (!state.host || form.userId !== state.host.userId) {
        throw new Response(t("room.error.hostOnly"), { status: 403 });
      }
      await requireSessionUserId(request, form.userId, authSession);
    }
    const clue = state.activeClue
      ? state.game.boards.at(state.round)?.categories[state.activeClue[1]]
          ?.clues[state.activeClue[0]]
      : undefined;
    if (!state.activeClue || !clue || !hasPlayableMedia(getClueMedia(clue))) {
      return conflict(t("room.error.noMediaToReplay"));
    }
    await createRoomEventAsServer(room.id, ActionType.ReplayMedia, {
      userId: form.userId,
      round: state.round,
      i: state.activeClue[0],
      j: state.activeClue[1],
      ...(isAdmin ? { admin: true } : { host: true }),
    });
    return null;
  }

  if (form.intent === "release") {
    if (!state.host) {
      return conflict(t("room.error.noHost"));
    }
    if (!isAdmin) {
      // Only the host frees their own seat.
      if (form.userId !== state.host.userId) {
        throw new Response(t("room.error.hostOnly"), { status: 403 });
      }
      await requireSessionUserId(request, form.userId, authSession);
    }
    if (state.activeClue !== null) {
      return conflict(t("room.error.hostBetweenQuestions"));
    }
    await createRoomEventAsServer(room.id, ActionType.ReleaseHost, {
      userId: state.host.userId,
      ...(isAdmin ? { admin: true } : {}),
    });
    return null;
  }

  const { userId, name, avatar } = form;
  if (state.players.has(userId)) {
    return conflict(t("room.error.hostIsPlayer"));
  }
  if (form.intent === "claim" && state.host) {
    return conflict(t("room.error.hostSeatTaken", { name: state.host.name }));
  }
  // Switching to host mode (an empty seat) only between questions.
  if (!state.host && state.activeClue !== null) {
    return conflict(t("room.error.hostBetweenQuestions"));
  }
  await createRoomEventAsServer(
    room.id,
    form.intent === "claim" ? ActionType.ClaimHost : ActionType.AssignHost,
    {
      userId,
      name,
      ...(avatar ? { avatar } : {}),
      ...(form.intent === "assign" ? { admin: true } : {}),
    },
  );
  return null;
}
