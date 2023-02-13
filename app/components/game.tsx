import * as React from "react";

import { Game } from "~/models/game.server";
import BoardComponent from "~/components/board";
import ClueState from "~/utils/clue-state";
import BoardState from "~/utils/board-state";
import Prompt from "~/components/prompt";
import {
  SinglePreview,
  DoublePreview,
  FinalPreview,
  EndPreview,
} from "~/components/preview";
import { Board } from "~/models/board.server";

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
  const [clueIdx, setClueIdx] = React.useState<{ i: number; j: number }>();

  const [round, setRound] = React.useState(0);

  const [showPreview, setShowPreview] = React.useState(true);

  const getActiveClue = (i: number, j: number) => {
    const board = game.boards[round];
    if (board) {
      const category = board.categories[j];
      return board.clues[category][i];
    }
  };

  const handleClickClue = (i: number, j: number) => {
    const boardState = gameState.get(round);
    if (!boardState || boardState.get(i, j)?.isAnswered) {
      return;
    }
    // not yet answered
    const newClueState = new ClueState({
      isActive: true,
      isAnswered: false,
    });
    const newBoardState = boardState.set(i, j, newClueState);
    setGameState((gs) => gs.set(round, newBoardState));
    setClueIdx({ i, j });
  };

  if (errorMsg !== undefined) {
    return <div>Error :({errorMsg}</div>;
  }

  const handleClickPrompt = (i: number, j: number) => {
    const newClueState = new ClueState({
      isAnswered: true,
      isActive: false,
    });
    const newBoardState = gameState.get(round).set(i, j, newClueState);
    setGameState((gs) => gs.set(round, newBoardState));

    if (newBoardState.answered()) {
      setRound((r) => r + 1);
      setShowPreview(true);
    }
    setClueIdx(undefined);
  };

  const renderPreview = () => {
    switch (round) {
      case game.boards.length:
        return <EndPreview board={game.boards[round - 1]} />;
      case game.boards.length - 1:
        return <FinalPreview onClick={() => setShowPreview(false)} />;
      case 0:
        return <SinglePreview onClick={() => setShowPreview(false)} />;
      case 1:
        return <DoublePreview onClick={() => setShowPreview(false)} />;
    }
  };

  const board: Board | undefined = game.boards[round];
  return (
    <>
      {showPreview ? renderPreview() : null}
      <Prompt
        clue={clueIdx ? getActiveClue(clueIdx.i, clueIdx.j) : undefined}
        onClick={() =>
          clueIdx ? handleClickPrompt(clueIdx.i, clueIdx.j) : null
        }
      />
      {board && (
        <BoardComponent
          board={board}
          roundMultiplier={round + 1}
          boardState={gameState.get(round)}
          onClickClue={handleClickClue}
        />
      )}
    </>
  );
}
