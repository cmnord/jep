import type { ActionArgs, LoaderArgs, V2_MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";

import Button from "~/components/button";
import { ErrorMessage, SuccessMessage } from "~/components/error";
import Input from "~/components/input";
import Link, { Anchor } from "~/components/link";
import Main from "~/components/main";
import { getValidAuthSession } from "~/models/auth";
import { getGame } from "~/models/game.server";
import { insertReport } from "~/models/report.server";
import { getRoom } from "~/models/room.server";
import { BASE_URL, GITHUB_URL } from "~/utils";

export const meta: V2_MetaFunction = () => [{ title: "Report a game" }];

const ROOM_NAME_REGEX = /^\d+-\w+$/;

export async function loader({ request }: LoaderArgs) {
  const url = new URL(request.url);
  const search = new URLSearchParams(url.search);
  const gameId = search.get("gameId");

  return json({ BASE_URL, gameId });
}

export async function action({ request }: ActionArgs) {
  const formData = await request.formData();
  const url = new URL(formData.get("url") as string);

  if (url.origin !== BASE_URL) {
    return json(
      {
        success: false,
        message: `URL must be from ${BASE_URL}`,
      },
      { status: 400 }
    );
  }

  const authSession = await getValidAuthSession(request);
  const pathname = url.pathname;

  if (pathname.startsWith("/room/")) {
    const roomNameAndId = pathname.slice("/room/".length);

    if (!ROOM_NAME_REGEX.test(roomNameAndId)) {
      return json(
        {
          success: false,
          message: "room name must be in the format of {roomId}-{roomName}",
        },
        { status: 400 }
      );
    }

    const parts = roomNameAndId.split("-");
    const roomId = parseInt(parts[0]);
    const name = parts[1];

    const room = await getRoom(roomId);
    if (!room || room.name !== name) {
      return json(
        { success: false, message: `room "${roomNameAndId}" not found` },
        { status: 404 }
      );
    }

    const reason = formData.get("reason") as string;
    await insertReport(room.game_id, reason, authSession?.userId);

    return json({
      success: true,
      message: `Reported game ${room.game_id} in room ${roomNameAndId}.`,
    });
  } else if (pathname.startsWith("/game/")) {
    const gameIdAndSubpath = pathname.slice("/game/".length);
    const gameId = gameIdAndSubpath.split("/")[0];

    try {
      const game = await getGame(gameId, authSession?.userId);
      if (!game) {
        return json(
          { success: false, message: `game "${gameId}" not found` },
          { status: 404 }
        );
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        return json(
          { success: false, message: `Error fetching game: ${error.message}` },
          { status: 404 }
        );
      }
      throw error;
    }

    const reason = formData.get("reason") as string;
    await insertReport(gameId, reason, authSession?.userId);

    return json(
      { success: true, message: `Reported game ${gameId}.` },
      { status: 404 }
    );
  }

  return json(
    { success: false, message: "Could not find /game/ or /room/ in URL." },
    { status: 400 }
  );
}

export default function Report() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="max-w-full grow">
      <Main>
        <h1 className="mb-4 text-2xl font-semibold">Report game</h1>
        <p className="mb-4">
          Please report any game which violates the{" "}
          <Link to="/community">community guidelines</Link>.
          <br className="mb-1" />
          For anything else, please submit an issue on the{" "}
          <Anchor href={GITHUB_URL}>GitHub</Anchor> project.
        </p>
        <Form method="POST" className="flex flex-col gap-2">
          <label
            htmlFor="url"
            className="block text-sm font-medium text-gray-700"
          >
            Link to game
          </label>
          <Input
            type="text"
            id="url"
            name="url"
            placeholder={`${data.BASE_URL}/room/... or ${data.BASE_URL}/game/...`}
            required
            defaultValue={
              data.gameId ? `${data.BASE_URL}/game/${data.gameId}` : undefined
            }
          />
          <label
            htmlFor="reason"
            className="block text-sm font-medium text-gray-700"
          >
            Reason
          </label>
          <Input
            type="text"
            id="reason"
            name="reason"
            placeholder="e.g. spam"
            required
          />
          <Button type="primary" htmlType="submit">
            Report
          </Button>
          {actionData ? (
            actionData.success ? (
              <SuccessMessage>{actionData.message}</SuccessMessage>
            ) : (
              <ErrorMessage>{actionData.message}</ErrorMessage>
            )
          ) : null}
        </Form>
      </Main>
    </div>
  );
}
