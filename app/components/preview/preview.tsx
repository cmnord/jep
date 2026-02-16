import { Form as fetcherForm, useFetcher } from "@remix-run/react";

import Button from "~/components/button";
import CopyLinkButton from "~/components/copy-link-button";
import Dialog from "~/components/dialog";
import type { RoomProps } from "~/components/game";
import HowToPlay from "~/components/how-to-play";
import Link from "~/components/link";
import { EditPlayerForm, PlayerIcon } from "~/components/player";
import SoundControl from "~/components/sound";
import type { Player } from "~/engine";
import { Action, GameState, useEngineContext } from "~/engine";
import { Board } from "~/models/convert.server";
import { stringToHslColor } from "~/utils";
import useSoloAction from "~/utils/use-solo-action";

function JoinGameDialog({
  Form,
  gameTitle,
  name,
  players,
  roomId,
  type,
  userId,
}: {
  Form: typeof fetcherForm;
  gameTitle: string;
  name: string;
  players: Map<string, Player>;
  type: GameState;
} & RoomProps) {
  return (
    <Dialog
      isOpen={type !== GameState.GameOver}
      title={`Join game "${gameTitle}"?`}
      description={`${players.size} player${
        players.size === 1 ? "" : "s"
      } so far`}
    >
      <ul className="mb-4 list-inside list-disc font-handwriting text-xl font-bold">
        {Array.from(players.values()).map((p, i) => (
          <li key={i} style={{ color: stringToHslColor(p.userId) }}>
            {p.name}
          </li>
        ))}
      </ul>
      <Dialog.Footer>
        <Form method="POST" action={`/room/${roomId}/player`}>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="name" value={name} />
          <Button type="primary" htmlType="submit">
            Join game
          </Button>
        </Form>
      </Dialog.Footer>
    </Dialog>
  );
}

function PreviewRoundDialog({
  board,
  boardControl,
  Form,
  numRounds,
  onDismiss,
  players,
  round,
  type,
  url,
  roomId,
  userId,
}: {
  board: Board;
  boardControl: string | null;
  Form: typeof fetcherForm;
  numRounds: number;
  onDismiss: () => void;
  players: Map<string, Player>;
  round: number;
  type: GameState;
  url: string;
} & RoomProps) {
  const isOpen = type === GameState.PreviewRound;

  const boardController = boardControl ? players.get(boardControl) : undefined;
  const boardControlName = boardController
    ? boardController.name
    : "Unknown player";

  if (!board) return null;

  const isSingleLongFormClue =
    board.categories.length === 1 &&
    board.categories[0].clues.length === 1 &&
    board.categories[0].clues[0].longForm;

  const borderColor = boardController
    ? stringToHslColor(boardController.userId)
    : "gray";

  return (
    <Dialog
      isOpen={isOpen}
      title={
        <div className="flex justify-between">
          <span>
            Start round {round + 1} of {numRounds}
          </span>
          <SoundControl showSlider={false} />
        </div>
      }
      description={
        isSingleLongFormClue ? null : (
          <>
            <span
              className="border-b-4 font-handwriting text-xl font-bold"
              style={{ borderColor }}
            >
              {boardControlName}
            </span>{" "}
            starts with control of the board.
          </>
        )
      }
    >
      {round === 0 ? (
        <div className="flex flex-col gap-2">
          <EditPlayerForm roomId={roomId} userId={userId} winning={false} />
          <div className="flex flex-wrap gap-2">
            {Array.from(players.values()).map((p, i) => (
              <PlayerIcon key={i} player={p} />
            ))}
          </div>
          <HowToPlay />
          <Link className="mb-2 text-sm text-white" to="/howto">
            Practice buzzing &rarr;
          </Link>
        </div>
      ) : null}
      <Dialog.Footer>
        <CopyLinkButton url={url} text="Copy link to room" />
        {boardControl === userId || isSingleLongFormClue ? (
          <Form method="POST" action={`/room/${roomId}/start`}>
            <input type="hidden" name="round" value={round} />
            <input type="hidden" name="userId" value={userId} />
            <Button type="primary" htmlType="submit" onClick={onDismiss}>
              Start round
            </Button>
          </Form>
        ) : null}
      </Dialog.Footer>
    </Dialog>
  );
}

export function Preview({
  gameTitle,
  name,
  numRounds,
  onDismiss,
  url,
  roomId,
  userId,
}: {
  gameTitle: string;
  name: string;
  numRounds: number;
  onDismiss: () => void;
  url: string;
} & RoomProps) {
  const { type, board, boardControl, players, round, soloDispatch } =
    useEngineContext();

  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);

  if (!board) return null;

  const userInGame = players.has(userId);

  if (userInGame) {
    return (
      <PreviewRoundDialog
        board={board}
        boardControl={boardControl}
        Form={fetcher.Form}
        numRounds={numRounds}
        onDismiss={onDismiss}
        players={players}
        round={round}
        type={type}
        url={url}
        roomId={roomId}
        userId={userId}
      />
    );
  }
  return (
    <JoinGameDialog
      type={type}
      Form={fetcher.Form}
      gameTitle={gameTitle}
      name={name}
      players={players}
      roomId={roomId}
      userId={userId}
    />
  );
}
