import * as React from "react";

import BoardComponent from "~/components/board";
import ClueList from "~/components/clue-list";
import Prompt from "~/components/prompt/prompt";
import Preview from "~/components/preview";

import type { Game, Clue } from "~/models/convert.server";
import { useEngineContext } from "~/engine/use-engine-context";
import Players from "./player/player";
import { GameState } from "~/engine/engine";

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
