import * as React from "react";
import { Clue, Game } from "~/models/convert.server";

import { useMatrix } from "./use-matrix";

export function useGame(game: Game) {
  const [round, setRound] = React.useState(0);
  const [board, setBoard] = React.useState(game.boards[round]);
  const [numAnswered, setNumAnswered] = React.useState(0);

  React.useEffect(() => {
    if (round < game.boards.length) {
      setBoard(game.boards[round]);
      setNumAnswered(0);
    }
  }, [round]);

  const [numCluesInBoard, setNumCluesInBoard] = React.useState(
    board.categories.reduce(
      (acc, category) => (acc += category.clues.length),
      0
    )
  );

  const {
    get: isAnswered,
    set: setIsAnswered,
    resize: resizeIsAnswered,
  } = useMatrix(
    board.categories[0].clues.length,
    board.categories.length,
    false
  );

  React.useEffect(() => {
    const numClues = board.categories.reduce(
      (acc, category) => (acc += category.clues.length),
      0
    );
    setNumCluesInBoard(numClues);
    resizeIsAnswered(
      board.categories[0].clues.length,
      board.categories.length,
      false
    );
  }, [board]);

  const [clue, setClue] = React.useState<Clue | undefined>();
  const [category, setCategory] = React.useState<string | undefined>();
  const [activeClueIdx, setActiveClue] = React.useState<[number, number]>();

  React.useEffect(() => {
    if (activeClueIdx) {
      const [i, j] = activeClueIdx;
      setClue(board.categories[j].clues[i]);
      setCategory(board.categories[j].name);
    } else {
      setClue(undefined);
    }
  }, [activeClueIdx, board]);

  const answerClue = () => {
    if (!activeClueIdx) {
      return;
    }
    const [i, j] = activeClueIdx;
    console.log("answering clue");
    setIsAnswered(i, j, true);
    const newNumAnswered = numAnswered + 1;
    setNumAnswered(newNumAnswered);
    let roundChanged = false;

    console.log("answered", newNumAnswered, "vs total", numCluesInBoard);
    if (newNumAnswered === numCluesInBoard) {
      setRound((r) => r + 1);
      roundChanged = true;
    }

    setActiveClue(undefined);

    return roundChanged;
  };

  const onClickClue = (i: number, j: number) => {
    if (isAnswered(i, j)) {
      return;
    }
    console.log("active clue is ", i, j);
    setActiveClue([i, j]);
  };

  return {
    round,
    isAnswered,
    answerClue,
    board,
    clue,
    category,
    onClickClue,
  };
}
