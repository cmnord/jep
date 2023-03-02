import * as React from "react";

import BoardComponent from "~/components/board";
import ClueList from "~/components/clue-list";
import Preview from "~/components/preview";
import Prompt from "~/components/prompt";

import { GameState } from "~/engine/engine";
import { useEngineContext } from "~/engine/use-engine-context";
import type { Clue, Game } from "~/models/convert.server";
import Players from "./player/player";

/** GameComponent maintains the game state. */
export default function GameComponent({
  game,
  errorMsg,
  userId,
  roomName,
}: {
  game: Game;
  errorMsg?: string;
  userId: string;
  roomName: string;
}) {
  const { type, board } = useEngineContext();

  const [focusedClueIdx, setFocusedClue] = React.useState<[number, number]>();

  const finalBoard = game.boards[game.boards.length - 1];
  const finalClues =
    finalBoard.categories[finalBoard.categories.length - 1].clues;
  const finalClue: Clue | undefined = finalClues[finalClues.length - 1];

  if (errorMsg !== undefined) {
    return <div>Error :({errorMsg}</div>;
  }

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
            focusedClueIdx={focusedClueIdx}
            onFocusClue={onFocusClue}
            userId={userId}
            roomName={roomName}
          />
        )}
      </div>
      <div className="p-12">
        {type !== GameState.Preview && (
          <Players userId={userId} roomName={roomName} />
        )}
        {board && (
          <ClueList focusedClueIdx={focusedClueIdx} onFocusClue={onFocusClue} />
        )}
      </div>
      <Prompt roomName={roomName} userId={userId} />
    </>
  );
}
