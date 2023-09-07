import classNames from "classnames";
import BoardComponent from "~/components/board";
import Link from "~/components/link";
import { PlayerScores } from "~/components/player";
import Preview from "~/components/preview";
import Prompt from "~/components/prompt";
import { GameState, useEngineContext } from "~/engine";
import type { Game } from "~/models/convert.server";
import useGameSound from "~/utils/use-sound";

const BOARD_FILL_SFX = "/sounds/board-fill.mp3";
const FINAL_CATEGORY_REVEAL_SFX = "/sounds/final-category-reveal.mp3";

export interface RoomProps {
  roomId: number;
  userId: string;
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
  const { type, round, connected, lastMessageAt } = useEngineContext();

  const [playBoardFillSfx] = useGameSound(BOARD_FILL_SFX);
  const [playFinalSfx] = useGameSound(FINAL_CATEGORY_REVEAL_SFX);

  const { players, boardControl } = useEngineContext();

  const boardController = boardControl ? players.get(boardControl) : undefined;
  const boardControlName = boardController
    ? boardController.name
    : "Unknown player";

  const board = game.boards[round];
  const isSingleLongFormClue =
    board.categories.length === 1 &&
    board.categories[0].clues.length === 1 &&
    board.categories[0].clues[0].longForm;

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
      <div className="flex grow flex-col bg-slate-900">
        <BoardComponent roomId={roomId} userId={userId} />
        <div
          className={`mx-auto flex w-full max-w-screen-lg flex-col gap-4 p-3
          text-slate-100 sm:p-6 md:p-12`}
        >
          {type === GameState.GameOver ? (
            <>
              <h2 className="text-xl font-semibold">Game over!</h2>
              <Link to={`/room/${roomName}/summary`}>
                Review your game &rarr;
              </Link>
            </>
          ) : isSingleLongFormClue ? (
            <div className="italic text-slate-300">
              Let's go to the final clue!
            </div>
          ) : (
            <div className="italic text-slate-300">
              <span className="font-bold">{boardControlName} </span>
              is choosing the next clue.
            </div>
          )}
          <PlayerScores roomId={roomId} userId={userId} />
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <div
              className={classNames("h-2 w-2 shrink-0 rounded-full", {
                "bg-green-500": connected,
                "bg-red-500": !connected,
              })}
            />
            <span>
              {connected ? "Connected." : "Disconnected..."}
              {lastMessageAt ? (
                <span>
                  {" "}
                  Last message received{" "}
                  {new Date(lastMessageAt).toLocaleTimeString()}.
                </span>
              ) : null}
            </span>
          </div>
        </div>
        <Prompt roomId={roomId} userId={userId} />
      </div>
    </>
  );
}
