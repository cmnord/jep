import * as React from "react";

import BoardComponent from "~/components/board";
import ClueList from "~/components/clue-list";
import Prompt from "~/components/prompt";
import Preview from "~/components/preview";

import { Board } from "~/models/board.server";
import { Clue } from "~/models/clue.server";
import { Game } from "~/models/game.server";

import BoardState from "~/utils/board-state";
import ClueState from "~/utils/clue-state";

class GameState {
  boardStates: BoardState[];

  constructor(g: Game) {
    this.boardStates = [];
    for (const board of g.boards) {
      this.boardStates.push(new BoardState(board));
    }
  }

  get(round: number) {
    return this.boardStates[round];
  }

  set(round: number, state: BoardState) {
    this.boardStates[round] = state;
    return this;
  }
}

/** GameComponent maintains the game state. */
export default function GameComponent({
  game,
  errorMsg,
}: {
  game: Game;
  errorMsg?: string;
}) {
  const [gameState, setGameState] = React.useState(new GameState(game));
  const [activeClue, setActiveClue] = React.useState<{
    i: number;
    j: number;
  }>();
  const [focusedClue, setFocusedClue] = React.useState<{
    i: number;
    j: number;
  }>();

  const [round, setRound] = React.useState(0);

  const [showPreview, setShowPreview] = React.useState(true);

  const board: Board | undefined = game.boards[round];

  const getActiveClue = (i: number, j: number) => {
    if (board) {
      const category = board.categories[j];
      return category.clues[i];
    }
  };

  const clue = activeClue
    ? getActiveClue(activeClue.i, activeClue.j)
    : undefined;

  const finalBoard = game.boards[game.boards.length - 1];
  const clues = finalBoard.categories[finalBoard.categories.length - 1].clues;
  const finalClue: Clue | undefined = clues[clues.length - 1];

  const handleClickClue = (i: number, j: number) => {
    const boardState = gameState.get(round);
    if (boardState.get(i, j)?.isAnswered) {
      return;
    }
    setActiveClue({ i, j });
  };

  const handleFocusClue = (i: number, j: number) => {
    setFocusedClue({ i, j });
  };

  if (errorMsg !== undefined) {
    return <div>Error :({errorMsg}</div>;
  }

  const handleClickPrompt = (i: number, j: number) => {
    const newClueState = new ClueState({
      isAnswered: true,
    });
    const newBoardState = gameState.get(round).set(i, j, newClueState);
    setGameState((gs) => gs.set(round, newBoardState));

    if (newBoardState.answered()) {
      setRound((r) => r + 1);
      setShowPreview(true);
    }
    setActiveClue(undefined);
  };

  return (
    <>
      <Preview
        round={round}
        numRounds={game.boards.length}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        finalClue={finalClue}
      />
      <div className="bg-black">
        {board && (
          <BoardComponent
            board={board}
            roundMultiplier={round + 1}
            boardState={gameState.get(round)}
            onClickClue={handleClickClue}
            onFocusClue={handleFocusClue}
          />
        )}
      </div>
      <Prompt
        clue={clue}
        onClose={() =>
          activeClue && handleClickPrompt(activeClue.i, activeClue.j)
        }
      />
    </>
  );
}
