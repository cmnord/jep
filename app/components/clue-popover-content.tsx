import { getPlayer } from "~/engine/state";
import type { State } from "~/engine/state";
import type { Clue } from "~/models/convert.server";
import { formatDollarsWithSign } from "~/utils";

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

export default function CluePopoverContent({
  clue,
  state,
  round,
  i,
  j,
}: {
  clue: Clue;
  state: State;
  round: number;
  i: number;
  j: number;
}) {
  const key = `${round},${i},${j}`;
  const wagers = state.wagers.get(key);
  const answers = state.answers.get(key);
  const clueAnswer = state.isAnswered[round]?.[i]?.[j];

  if (!clueAnswer) return null;

  return (
    <div>
      <p>{clue.clue}</p>
      <p className="uppercase">{clue.answer}</p>
      {clue.wagerable && wagers ? (
        <div className="pt-2">
          {Array.from(wagers.entries()).map(([userId, wager]) => {
            const player = getPlayer(state, userId);
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
              const player = getPlayer(state, userId);
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
