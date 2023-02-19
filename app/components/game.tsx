import * as React from "react";

import BoardComponent from "~/components/board";
import ClueList from "~/components/clue-list";
import Prompt from "~/components/prompt";
import Preview from "~/components/preview";

import { Game, Clue } from "~/models/convert.server";
import { useGameContext } from "~/utils/use-game-context";

/** GameComponent maintains the game state. */
export default function GameComponent({
  game,
  errorMsg,
}: {
  game: Game;
  errorMsg?: string;
}) {
  const { board, answerClue } = useGameContext();

  const [showPreview, setShowPreview] = React.useState(true);
  const [focusedClueIdx, setFocusedClue] = React.useState<[number, number]>();

  const finalBoard = game.boards[game.boards.length - 1];
  const finalClues =
    finalBoard.categories[finalBoard.categories.length - 1].clues;
  const finalClue: Clue | undefined = finalClues[finalClues.length - 1];

  if (errorMsg !== undefined) {
    return <div>Error :({errorMsg}</div>;
  }

  const handleClickPrompt = () => {
    const roundChanged = answerClue();

    if (roundChanged) {
      setShowPreview(true);
    }
  };

  const onFocusClue = (i: number, j: number) => {
    setFocusedClue([i, j]);
  };

  return (
    <>
      <Preview
        numRounds={game.boards.length}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        finalClue={finalClue}
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
        {board && (
          <ClueList focusedClueIdx={focusedClueIdx} onFocusClue={onFocusClue} />
        )}
      </div>
      <Prompt onClose={handleClickPrompt} />
    </>
  );
}
