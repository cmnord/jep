import * as React from "react";

import BoardComponent from "~/components/board";
import ClueList from "~/components/clue-list";
import Players from "~/components/player";
import Preview from "~/components/preview";
import Prompt from "~/components/prompt";

import { GameState, useEngineContext } from "~/engine";
import type { Clue, Game } from "~/models/convert.server";

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
  const { type, board, round, activeClue } = useEngineContext();

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

  const onFocusClue = (i: number, j: number) => {
    setFocusedClue([i, j]);
  };

  return (
    <>
      <Preview
        numRounds={game.boards.length}
        finalClue={finalClue}
        userId={userId}
        roomName={roomName}
      />
      <div className="bg-black">
        <BoardComponent
          focusedClue={focusedClueIdx}
          setFocusedClue={onFocusClue}
          userId={userId}
          roomName={roomName}
        />
      </div>
      <div className="p-3 sm:p-6 md:p-12 ">
        {(type !== GameState.Preview || round !== 0) && (
          <Players userId={userId} roomName={roomName} />
        )}
        {board && (
          <ClueList focusedClue={focusedClueIdx} setFocusedClue={onFocusClue} />
        )}
      </div>
      <Prompt roomName={roomName} userId={userId} />
    </>
  );
}
