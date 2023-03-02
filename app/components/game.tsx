import * as React from "react";

import BoardComponent from "~/components/board";
import ClueList from "~/components/clue-list";
import Players from "~/components/player";
import Preview from "~/components/preview";
import Prompt from "~/components/prompt";

import { GameState } from "~/engine/engine";
import { useEngineContext } from "~/engine/use-engine-context";
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
  const { type, board } = useEngineContext();

  const [focusedClueIdx, setFocusedClue] = React.useState<[number, number]>();

  const finalBoard = game.boards[game.boards.length - 1];
  const finalClues =
    finalBoard.categories[finalBoard.categories.length - 1].clues;
  const finalClue: Clue | undefined = finalClues[finalClues.length - 1];

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
        {/* TODO: board should never be undefined */}
        {board && (
          <BoardComponent
            focusedClue={focusedClueIdx}
            setFocusedClue={onFocusClue}
            userId={userId}
            roomName={roomName}
          />
        )}
      </div>
      <div className="p-3 sm:p-6 md:p-12 ">
        {type !== GameState.Preview && (
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
