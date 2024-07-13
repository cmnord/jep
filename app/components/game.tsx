import { useNavigate } from "@remix-run/react";
import * as React from "react";

import BoardComponent from "~/components/board";
import Connection from "~/components/connection";
import Link from "~/components/link";
import { PlayerScores } from "~/components/player";
import Preview from "~/components/preview";
import Prompt from "~/components/prompt";
import { GameState, Player, useEngineContext } from "~/engine";
import type { Game } from "~/models/convert.server";
import useGameSound from "~/utils/use-sound";

const BOARD_FILL_SFX = "/sounds/board-fill.mp3";
const FINAL_CATEGORY_REVEAL_SFX = "/sounds/final-category-reveal.mp3";

export interface RoomProps {
  roomId: number;
  userId: string;
}

function CallToAction({
  type,
  isSingleLongFormClue,
  boardController,
  roomName,
  userId,
}: {
  type: GameState;
  isSingleLongFormClue: boolean;
  boardController?: Player;
  roomName: string;
  userId: string;
}) {
  if (type === GameState.GameOver) {
    return (
      <>
        <h2 className="text-xl font-semibold">Game over!</h2>
        <Link to={`/room/${roomName}/summary`}>Review your game &rarr;</Link>
      </>
    );
  }
  if (isSingleLongFormClue) {
    return (
      <div className="italic text-slate-300">Let's go to the final clue!</div>
    );
  }
  if (boardController) {
    if (boardController.userId === userId) {
      return <strong className="text-center">You control the board.</strong>;
    }
    return (
      <strong className="text-center">
        {boardController.name} has control of the board.
      </strong>
    );
  }
  return null;
}

/** GameComponent maintains the game state. */
export default function GameComponent({
  game,
  name,
  roomId,
  roomName,
  userId,
  url,
}: {
  game: Game;
  name: string;
  roomName: string;
  url: string;
} & RoomProps) {
  const { boardControl, connectionState, lastMessageAt, players, round, type } =
    useEngineContext();

  const [playBoardFillSfx] = useGameSound(BOARD_FILL_SFX);
  const [playFinalSfx] = useGameSound(FINAL_CATEGORY_REVEAL_SFX);

  const navigate = useNavigate();
  React.useEffect(() => {
    if (type === GameState.GameOver) {
      navigate(`/room/${roomName}/summary`);
    }
  }, [navigate, roomName, type]);

  const boardController = boardControl ? players.get(boardControl) : undefined;

  const board = game.boards[round];
  const isSingleLongFormClue =
    board.categories.length === 1 &&
    board.categories[0].clues.length === 1 &&
    Boolean(board.categories[0].clues[0].longForm);

  return (
    <>
      <Preview
        gameTitle={game.title}
        name={name}
        numRounds={game.boards.length}
        onDismiss={isSingleLongFormClue ? playFinalSfx : playBoardFillSfx}
        url={url}
        roomId={roomId}
        userId={userId}
      />
      <div className="flex grow flex-col bg-blue-1000">
        <BoardComponent roomId={roomId} userId={userId} />
        <div
          className={`mx-auto flex w-full max-w-screen-lg flex-col gap-4 p-3
          text-slate-100 sm:p-6 md:p-12`}
        >
          <CallToAction
            boardController={boardController}
            type={type}
            isSingleLongFormClue={isSingleLongFormClue}
            roomName={roomName}
            userId={userId}
          />
          <PlayerScores roomId={roomId} userId={userId} />
          <Connection state={connectionState} lastMessageAt={lastMessageAt} />
        </div>
        <Prompt roomId={roomId} userId={userId} />
      </div>
    </>
  );
}
