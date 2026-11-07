import type { State } from "~/engine/state";
import type { Clue, Game } from "~/models/convert.server";
import type { Json } from "~/models/database.types";
import type { MediaBlock } from "~/utils/media";

/** Host mode (feature 22) mimics SIGame: only the host sees the answers.
 * The room and TV loaders send every other visitor the game without the
 * answers of unresolved questions, and the server reveals each answer with a
 * reveal_answer event once its question is resolved.
 *
 * Shared by the server (loaders, routes) and the client (deciding when to
 * refetch the loader), so it must stay free of server-only imports. */

/** shouldWithholdAnswers: the visitor `userId` must not get the answers of
 * unresolved questions — there is a host and it isn't them (the host and the
 * site admin see everything). */
export function shouldWithholdAnswers(
  state: Pick<State, "host">,
  userId: string | null,
  isAdmin: boolean,
) {
  return state.host !== null && state.host.userId !== userId && !isAdmin;
}

/** isResolved: question (i, j) of `round` was played (or skipped), or its
 * answer was revealed. */
export function isResolved(
  state: Pick<State, "isAnswered" | "revealed">,
  round: number,
  i: number,
  j: number,
) {
  return (
    (state.isAnswered.at(round)?.at(i)?.at(j)?.isAnswered ?? false) ||
    state.revealed.has(`${round},${i},${j}`)
  );
}

function hideAnswer(clue: Clue): Clue {
  // Drop answerMedia entirely (not just its content); the options of a
  // multiple choice question stay, and nothing else names the answer.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { answerMedia, ...rest } = clue;
  return { ...rest, answer: "" };
}

/** withholdAnswers returns the game without the answers (and answer media)
 * of every question not resolved yet. Resolved questions keep theirs. */
export function withholdAnswers<G extends Game>(
  game: G,
  state: Pick<State, "isAnswered" | "revealed">,
): G {
  return {
    ...game,
    boards: game.boards.map((board, round) => ({
      ...board,
      categories: board.categories.map((category, j) => ({
        ...category,
        clues: category.clues.map((clue, i) =>
          isResolved(state, round, i, j) ? clue : hideAnswer(clue),
        ),
      })),
    })),
  };
}

export interface AnswerReveal {
  round: number;
  i: number;
  j: number;
  answer: string;
  answerMedia?: MediaBlock[];
}

/** getAnswerToReveal is the reveal_answer payload the server must insert
 * now: in host mode, the active question was resolved (its answer is shown
 * to everyone) and its answer wasn't revealed yet. `state` must be replayed
 * with the full game (server side). */
export function getAnswerToReveal(
  state: Pick<
    State,
    "host" | "activeClue" | "round" | "game" | "isAnswered" | "revealed"
  >,
): AnswerReveal | null {
  if (!state.host || !state.activeClue) return null;
  const [i, j] = state.activeClue;
  const { round } = state;
  if (!state.isAnswered.at(round)?.at(i)?.at(j)?.isAnswered) return null;
  if (state.revealed.has(`${round},${i},${j}`)) return null;
  const clue = state.game.boards.at(round)?.categories.at(j)?.clues.at(i);
  if (!clue) return null;
  return {
    round,
    i,
    j,
    answer: clue.answer,
    ...(clue.answerMedia?.length ? { answerMedia: clue.answerMedia } : {}),
  };
}

/** revealPayload is a reveal as the JSON stored in its room event. A JSON
 * round trip is exactly what is written to the database, and yields a value
 * typed as JSON without asserting the reveal's own types onto it. */
export function revealPayload(
  reveal: NonNullable<ReturnType<typeof getAnswerToReveal>>,
): Json {
  return JSON.parse(JSON.stringify(reveal));
}
