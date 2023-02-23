import * as React from "react";

import BoardComponent from "~/components/board";
import ClueList from "~/components/clue-list";
import Prompt from "~/components/prompt";
import Preview from "~/components/preview";

import { Game, Clue } from "~/models/convert.server";
import { useGameContext } from "~/utils/use-game-context";
import { GameState } from "~/utils/use-game";
import Players from "./player";

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
  const { type, board, players, onClosePreview, onClosePrompt } =
    useGameContext();

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
        isOpen={type === GameState.Preview}
        onClose={onClosePreview}
        finalClue={finalClue}
        players={players}
        userId={userId}
        roomName={roomName}
      />
      <div className="bg-black">
        {board && (
          <BoardComponent
            focusedClueIdx={focusedClueIdx}
            onFocusClue={onFocusClue}
          />
        )}
      </div>
      <div className="p-12">
        <Players players={players} userId={userId} roomName={roomName} />
        {board && (
          <ClueList focusedClueIdx={focusedClueIdx} onFocusClue={onFocusClue} />
        )}
      </div>
      <Prompt onClose={onClosePrompt} />
    </>
  );
}
