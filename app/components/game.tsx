import * as React from "react";

import BoardComponent from "~/components/board";
import PlayerScores, { EditPlayerForm } from "~/components/player";
import Preview from "~/components/preview";
import Prompt from "~/components/prompt";
import { GameState, useEngineContext } from "~/engine";
import type { Clue, Game } from "~/models/convert.server";
import useGameSound from "~/utils/use-sound";
import { stringToHslColor } from "~/utils/utils";

const BOARD_FILL_SFX = "/sounds/board-fill.mp3";
const FINAL_CATEGORY_REVEAL_SFX = "/sounds/final-category-reveal.mp3";

/** GameComponent maintains the game state. */
export default function GameComponent({
  game,
  userId,
  roomName,
}: {
  game: Game;
  userId: string;
  roomName: string;
}) {
  const { type, round, activeClue } = useEngineContext();

  const [focusedClueIdx, setFocusedClue] = React.useState<[number, number]>();

  const finalBoard = game.boards[game.boards.length - 1];
  const finalClues =
    finalBoard.categories[finalBoard.categories.length - 1].clues;
  const finalClue: Clue | undefined = finalClues[finalClues.length - 1];

  // Keep track of the previous value of activeClue. If it changes to undefined,
  // focus on the previous clue.
  const prevClueRef = React.useRef(activeClue);
  React.useEffect(() => {
    const prevClue = prevClueRef.current;
    if (!activeClue && prevClue) {
      const [i, j] = prevClue;
      setFocusedClue([i, j]);
    }
    prevClueRef.current = activeClue;
  }, [activeClue]);

  const [playBoardFillSfx] = useGameSound(BOARD_FILL_SFX);
  const [playFinalSfx] = useGameSound(FINAL_CATEGORY_REVEAL_SFX);

  const onFocusClue = (i: number, j: number) => {
    setFocusedClue([i, j]);
  };

  const { players, boardControl } = useEngineContext();

  const boardController = boardControl ? players.get(boardControl) : undefined;
  const boardControlName = boardController
    ? boardController.name
    : "Unknown player";

  const boardControlColor = boardController
    ? stringToHslColor(boardController.userId)
    : "gray";

  return (
    <>
      <Preview
        numRounds={game.boards.length}
        finalClue={finalClue}
        userId={userId}
        roomName={roomName}
        onDismiss={
          round > 0 && round === game.boards.length - 1
            ? playFinalSfx
            : playBoardFillSfx
        }
      />
      <div className="flex flex-col bg-gray-900 grow">
        <BoardComponent
          focusedClue={focusedClueIdx}
          setFocusedClue={onFocusClue}
          userId={userId}
          roomName={roomName}
        />
        <div
          className={
            "p-3 sm:p-6 md:p-12 text-gray-100 w-full max-w-screen-lg mx-auto " +
            "flex flex-col gap-4"
          }
        >
          <p>
            <span
              className="font-bold border-b-4"
              style={{
                borderColor: boardControlColor,
              }}
            >
              {boardControlName}
            </span>{" "}
            has control of the board.
          </p>
          {(type !== GameState.PreviewRound || round !== 0) && (
            <EditPlayerForm roomName={roomName} userId={userId} />
          )}
          <PlayerScores />
          <div>
            <h2 className="text-md text-2xl font-semibold mb-2">
              {game.title}
            </h2>
            <p>by {game.author}</p>
            {game.note && (
              <p className="text-sm text-gray-500 text-left">{game.note}</p>
            )}
          </div>
        </div>
        <Prompt roomName={roomName} userId={userId} />
      </div>
    </>
  );
}
