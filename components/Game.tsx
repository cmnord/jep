import useSWR from "swr";
import React, { useEffect, useState } from "react";
import { GameResponse, Game } from "../pages/api/gameResponse";
import BoardComponent, {
  NUM_CATEGORIES,
  NUM_CLUES_PER_CATEGORY,
  Round,
} from "./Board";
import ClueState from "../lib/clue_state";
import BoardState from "../lib/board_state";
import Prompt from "./Prompt";
import {
  SinglePreview,
  DoublePreview,
  FinalPreview,
  EndPreview,
} from "./Preview";

interface Props {
  year: number;
  month: number;
  day: number;
}

type GameState = {
  [Round.Single]: BoardState;
  [Round.Double]: BoardState;
  [Round.Final]: ClueState;
  [Round.End]: undefined;
};

const TOTAL_NUM_CLUES = NUM_CATEGORIES * NUM_CLUES_PER_CATEGORY;
/** FINAL_CLUE_IDX is a sentinel value to show the final clue index. */
const FINAL_CLUE_IDX = { i: -1, j: -1 };

const emptyGameState: GameState = {
  [Round.Single]: new BoardState(),
  [Round.Double]: new BoardState(),
  [Round.Final]: new ClueState(),
  [Round.End]: undefined,
};

/** Game maintains the game state. */
export default function GameComponent(props: Props) {
  const [game, setGame] = useState<Game>();

  const [gameState, setGameState] = useState<GameState>(emptyGameState);
  const [clueIdx, setClueIdx] = useState<{ i: number; j: number }>();

  const [round, setRound] = useState(Round.Single);
  const [cluesAnswered, setCluesAnswered] = useState(0);

  const [showPreview, setShowPreview] = useState(true);

  const { data, error } = useSWR<GameResponse>(
    `/api/mockGameResponse?year=${props.year}&month=${props.month}&day=${props.day}`,
    (input, init) => fetch(input, init).then((res) => res.json())
  );

  // Set the game when the data arrives
  useEffect(() => {
    if (data && !data.error && data.game) {
      setGame(data.game);
    }
  }, [data]);

  const boardForGame = (g: Game | undefined) => {
    switch (round) {
      case Round.Single:
        return g?.single;
      case Round.Double:
        return g?.double;
      case Round.Final:
      case Round.End:
      default:
        return undefined;
    }
  };

  const getActiveClue = (idx?: { i: number; j: number }) => {
    if (!idx) {
      return undefined;
    }
    const board = boardForGame(game);
    if (board) {
      return board.categories[idx.i].clues[idx.j];
    }
    return game?.final;
  };

  const boardStateForRoundAndGameState = (r: Round, g: GameState) => {
    switch (r) {
      case Round.Single:
        return g[Round.Single];
      case Round.Double:
        return g[Round.Double];
      case Round.Final:
      case Round.End:
      default:
        return undefined;
    }
  };

  const handleClickClue = (i: number, j: number) => {
    const boardState = boardStateForRoundAndGameState(round, gameState);
    if (!boardState || boardState.get(i, j).isAnswered) {
      return;
    }
    // not yet answered
    const newClueState = new ClueState({
      isActive: true,
      isAnswered: false,
    });
    const newBoardState = boardState.set(i, j, newClueState);
    const newGameState: GameState = {
      ...gameState,
      [round]: newBoardState,
    };
    setGameState(newGameState);
    setClueIdx({ i, j });
  };

  if (error !== undefined) {
    return <div>Error :(</div>;
  }
  if (data?.error) {
    return <div>Error: {data.message}</div>;
  }

  const handleClickPrompt = (idx?: { i: number; j: number }) => {
    switch (round) {
      case Round.Single:
      case Round.Double: {
        if (!idx) {
          break;
        }
        const newClueState = new ClueState({
          isAnswered: true,
          isActive: false,
        });
        const newBoardState = gameState[round].set(idx.i, idx.j, newClueState);
        const newGameState: GameState = {
          ...gameState,
          [round]: newBoardState,
        };
        setGameState(newGameState);
        break;
      }
      case Round.Final: {
        const newClueState = new ClueState({
          isAnswered: true,
          isActive: false,
        });
        const newGameState: GameState = {
          ...gameState,
          [round]: newClueState,
        };
        setGameState(newGameState);
        break;
      }
      case Round.End:
      default:
        break;
    }

    const newCluesAnswered = cluesAnswered + 1;
    if (newCluesAnswered === TOTAL_NUM_CLUES) {
      setRound(Round.Double);
      setShowPreview(true);
    } else if (newCluesAnswered === TOTAL_NUM_CLUES * 2) {
      setRound(Round.Final);
      setShowPreview(true);
    } else if (newCluesAnswered === TOTAL_NUM_CLUES * 2 + 1) {
      setRound(Round.End);
      setShowPreview(true);
    }
    setCluesAnswered(newCluesAnswered);
    setClueIdx(undefined);
    return newCluesAnswered;
  };

  const handleDismissPreview = () => {
    setShowPreview(false);
  };

  const handleDismissFinalPreview = () => {
    setClueIdx(FINAL_CLUE_IDX);
    setShowPreview(false);
  };

  const renderPreview = () => {
    switch (round) {
      case Round.Single:
        return (
          <SinglePreview
            year={props.year}
            month={props.month}
            day={props.day}
            onClick={handleDismissPreview}
          />
        );
      case Round.Double:
        return <DoublePreview onClick={handleDismissPreview} />;
      case Round.Final:
        return <FinalPreview onClick={handleDismissFinalPreview} />;
      case Round.End:
      default:
        return <EndPreview finalClue={game?.final} />;
    }
  };

  return (
    <>
      {showPreview ? renderPreview() : null}
      <Prompt
        clue={getActiveClue(clueIdx)}
        onClick={() => handleClickPrompt(clueIdx)}
      />
      <BoardComponent
        board={boardForGame(game)}
        boardState={boardStateForRoundAndGameState(round, gameState)}
        onClickClue={handleClickClue}
        round={round}
      />
    </>
  );
}
