import classNames from "classnames";
import * as React from "react";

import { Category } from "~/components/board/category";
import Button from "~/components/button";
import Popover from "~/components/popover";
import { clueIsPlayable, State } from "~/engine";
import type { Board, Clue, Game } from "~/models/convert.server";
import { formatDollarsWithSign, generateGrid, stringToHslColor } from "~/utils";

function PlayerPoints({
  name,
  value,
  answer,
}: {
  name: string;
  value: number;
  answer?: string;
}) {
  return (
    <p className="font-mono text-xs">
      {name} {formatDollarsWithSign(value)}
      {answer ? `: "${answer}"` : ""}
    </p>
  );
}

interface Props {
  clue: Clue;
  state: State;
  round: number;
  i: number;
  j: number;
}

function CluePopover({ clue, state, round, i, j }: Props) {
  const key = `${round},${i},${j}`;
  const wagers = state.wagers.get(key);
  const answers = state.answers.get(key);

  const clueAnswer = state.isAnswered[round][i][j];

  return (
    <div>
      <p>{clue.clue}</p>
      <p className="uppercase">{clue.answer}</p>
      {clue.wagerable && wagers ? (
        <div className="pt-2">
          {Array.from(wagers.entries()).map(([userId, wager]) => {
            const player = state.players.get(userId);
            if (!player) return null;
            const answer = answers?.get(userId);
            const correct = clueAnswer.answeredBy.get(userId) ?? false;
            return (
              <PlayerPoints
                key={userId}
                name={player.name}
                answer={answer}
                value={correct ? wager : -wager}
              />
            );
          })}
        </div>
      ) : clueAnswer.answeredBy.size ? (
        <div className="pt-2">
          {Array.from(clueAnswer.answeredBy.entries()).map(
            ([userId, correct]) => {
              const player = state.players.get(userId);
              if (!player) return null;
              return (
                <PlayerPoints
                  key={userId}
                  name={player.name}
                  value={correct ? clue.value : -clue.value}
                />
              );
            },
          )}
        </div>
      ) : null}
    </div>
  );
}

function PostGameClue({ clue, state, round, i, j }: Props) {
  const clueAnswer = state.isAnswered[round][i][j];
  const clueValue =
    clue.wagerable && clueAnswer.isAnswered
      ? clue.longForm
        ? "Final"
        : "DD"
      : clue.value;

  if (!clueAnswer.isAnswered) {
    return (
      <td className="h-full sm:p-1">
        <div className="h-full w-full bg-slate-800 px-4 py-3">
          <p
            className={`text-shadow-md sm:text-shadow-lg flex items-center justify-center
            font-inter font-bold text-white opacity-75 transition-opacity
            group-hover:opacity-100`}
          >
            {clue.wagerable && clueAnswer.isAnswered ? null : (
              <span className="text-sm sm:text-3xl lg:text-4xl">$</span>
            )}
            <span className="text-md sm:text-4xl lg:text-5xl">{clueValue}</span>
          </p>
        </div>
      </td>
    );
  }

  const playable = clueIsPlayable(clue);

  const winningPlayers = Array.from(clueAnswer.answeredBy.entries()).filter(
    ([, correct]) => correct,
  );

  const backgroundColor = winningPlayers.length
    ? stringToHslColor(winningPlayers[0][0])
    : undefined;

  return (
    <td className="h-full sm:p-1">
      <Popover
        content={
          <CluePopover clue={clue} state={state} round={round} i={i} j={j} />
        }
      >
        <button
          disabled={!playable}
          className={classNames(
            `group h-full w-full bg-blue-1000 px-4 py-3 transition-colors
            hover:bg-blue-700`,
            {
              "bg-slate-800": !playable,
            },
          )}
          style={{ backgroundColor }}
        >
          <p
            className={`text-shadow-md sm:text-shadow-lg flex items-center
            justify-center font-inter font-bold text-white opacity-75 transition-opacity
            group-hover:opacity-100`}
          >
            {clue.wagerable ? null : (
              <span className="text-sm sm:text-3xl lg:text-4xl">$</span>
            )}
            <span className="text-md sm:text-4xl lg:text-5xl">{clueValue}</span>
          </p>
        </button>
      </Popover>
    </td>
  );
}

function PostGameBoard({
  board,
  state,
  round,
}: {
  board: Board;
  state: State;
  round: number;
}) {
  // Transpose the clues so we can render them in a table.
  const numRows = Math.max(...board.categories.map((c) => c.clues.length));
  const numCols = board.categories.length;

  const rows = generateGrid<Clue | undefined>(numRows, numCols, undefined);

  for (let i = 0; i < numRows; i++) {
    for (let j = 0; j < numCols; j++) {
      const clue = board.categories.at(j)?.clues.at(i);
      if (clue) {
        rows[i][j] = clue;
      }
    }
  }

  const roundRevealed = state.round >= round;

  return (
    <table className="h-1 w-full table-fixed border-spacing-3 text-white">
      <thead>
        <tr className="h-1">
          {board.categories.map((category) => (
            <Category
              key={category.name}
              name={roundRevealed ? category.name : "?"}
              note={category.note}
            />
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((category, i) => (
          <tr key={i}>
            {category.map((clue, j) =>
              clue ? (
                <PostGameClue
                  round={round}
                  i={i}
                  j={j}
                  key={`clue-${i}-${j}`}
                  clue={clue}
                  state={state}
                />
              ) : (
                <td key={`clue-${i}-${j}`} />
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RoundButtons({
  round,
  setRound,
  numRounds,
}: {
  round: number;
  setRound: (round: number) => void;
  numRounds: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        onClick={() => setRound((numRounds + round - 1) % numRounds)}
        type="transparent"
      >
        &larr;
      </Button>
      <p className="text-white">
        Round {round + 1}/{numRounds}
      </p>
      <Button
        onClick={() => setRound((round + 1) % numRounds)}
        type="transparent"
      >
        &rarr;
      </Button>
    </div>
  );
}

export default function Summary({ game, state }: { game: Game; state: State }) {
  const [round, setRound] = React.useState(0);
  const board = game.boards[round];

  return (
    <div>
      {game.boards.length > 1 ? (
        <RoundButtons
          round={round}
          setRound={setRound}
          numRounds={game.boards.length}
        />
      ) : null}
      <PostGameBoard board={board} state={state} round={round} />
    </div>
  );
}
