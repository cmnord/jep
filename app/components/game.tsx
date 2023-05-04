import * as React from "react";

import BoardComponent from "~/components/board";
import { WarningMessage } from "~/components/error";
import PlayerScores, { EditPlayerForm } from "~/components/player";
import PostGameSummary from "~/components/post-game-summary";
import Preview from "~/components/preview";
import Prompt from "~/components/prompt";
import { GameState, useEngineContext } from "~/engine";
import type { Game } from "~/models/convert.server";
import useGameSound from "~/utils/use-sound";
import { stringToHslColor } from "~/utils/utils";

const BOARD_FILL_SFX = "/sounds/board-fill.mp3";
const FINAL_CATEGORY_REVEAL_SFX = "/sounds/final-category-reveal.mp3";

export interface RoomProps {
  roomId: number;
  userId: string;
}

/** GameComponent maintains the game state. */
export default function GameComponent({
  game,
  roomId,
  userId,
  url,
}: {
  game: Game;
  url: string;
} & RoomProps) {
  const { type, round, activeClue } = useEngineContext();

  const [focusedClueIdx, setFocusedClue] = React.useState<[number, number]>();

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

  const isFinalRound = round > 0 && round === game.boards.length - 1;
  const isFinalRoundWithOneClue =
    isFinalRound &&
    game.boards[round].categories.length === 1 &&
    game.boards[round].categories[0].clues.length === 1 &&
    game.boards[round].categories[0].clues[0].longForm;

  return (
    <>
      <Preview
        numRounds={game.boards.length}
        roomId={roomId}
        userId={userId}
        onDismiss={isFinalRound ? playFinalSfx : playBoardFillSfx}
        url={url}
      />
      <div className="flex grow flex-col bg-slate-900">
        <BoardComponent
          focusedClue={focusedClueIdx}
          setFocusedClue={onFocusClue}
          roomId={roomId}
          userId={userId}
        />
        <div
          className={`mx-auto flex w-full max-w-screen-lg flex-col gap-4 p-3
          text-slate-100 sm:p-6 md:p-12`}
        >
          {type === GameState.GameOver ? <PostGameSummary /> : null}
          {type !== GameState.GameOver ? (
            isFinalRoundWithOneClue ? (
              <WarningMessage>Let's go to the final clue!</WarningMessage>
            ) : (
              <WarningMessage>
                <span
                  className="mr-2 border-b-4 font-handwriting text-xl font-bold"
                  style={{ borderColor: boardControlColor }}
                >
                  {boardControlName}
                </span>
                has control of the board.
              </WarningMessage>
            )
          ) : null}
          {type !== GameState.GameOver &&
          (type !== GameState.PreviewRound || round !== 0) ? (
            <EditPlayerForm roomId={roomId} userId={userId} />
          ) : null}
          <PlayerScores userId={userId} />
        </div>
        <Prompt roomId={roomId} userId={userId} />
      </div>
    </>
  );
}
