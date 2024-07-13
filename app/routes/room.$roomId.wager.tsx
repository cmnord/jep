import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import { ActionType } from "~/engine";
import { getValidAuthSession } from "~/models/auth";
import { createRoomEvent } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();

  const iStr = formData.get("i");
  if (typeof iStr !== "string") {
    throw new Response("Invalid i", { status: 400 });
  }
  const i = parseInt(iStr);

  const jStr = formData.get("j");
  if (typeof jStr !== "string") {
    throw new Response("Invalid j", { status: 400 });
  }
  const j = parseInt(jStr);

  const userId = formData.get("userId");
  if (typeof userId !== "string") {
    throw new Response("Invalid userId", { status: 400 });
  }

  const roomId = params.roomId ? parseInt(params.roomId) : undefined;
  if (!roomId) {
    throw new Response("room name not found in URL params", { status: 404 });
  }

  const wagerStr = formData.get("wager");
  const fullStr = formData.get("full");

  let wager: number;
  if (wagerStr) {
    if (typeof wagerStr !== "string") {
      throw new Response("Invalid wager", { status: 400 });
    }
    wager = parseInt(wagerStr);
  } else if (fullStr) {
    if (typeof fullStr !== "string") {
      throw new Response("Invalid full", { status: 400 });
    }
    wager = parseInt(fullStr);
  } else {
    throw new Response("wager or full required", { status: 400 });
  }

  if (roomId === -1) {
    return json({
      type: ActionType.SetClueWager,
      payload: { i, j, userId, wager },
    });
  }

  const authSession = await getValidAuthSession(request);
  const room = await getRoom(roomId, authSession?.accessToken);
  if (!room) {
    throw new Response("room not found", { status: 404 });
  }

  await createRoomEvent(
    room.id,
    ActionType.SetClueWager,
    {
      i,
      j,
      userId,
      wager,
    },
    authSession?.accessToken,
  );

  return null;
}
