import {
  CANT_BUZZ_FLAG,
  getStateTiebreakerSeed,
  getWinningBuzzer,
} from "./engine";
import { getBuzzWindowMs } from "./room-timers";
import { OPEN_QUESTION_STATES } from "./skip";
import { GameState, type State, isAutoCheckedClue } from "./state";

export { canSkipClue, OPEN_QUESTION_STATES } from "./skip";

/** AdminStep is what the game is waiting for from a player right now — the
 * step the site admin may do for them when they are stuck (feature 20). The
 * admin sends the player's own action tagged `admin: true`; the engine
 * applies it exactly as if the player had done it. */
export type AdminStep =
  /** Nothing waits on a player (game over, or nobody to act for). */
  | { kind: "none" }
  /** The round preview: `userId` starts the round. */
  | { kind: "start"; userId: string }
  /** The board: `userId` chooses the next question. */
  | { kind: "choose"; userId: string }
  /** A wagerable question: these players still have to wager. */
  | { kind: "wager"; userIds: string[] }
  /** A cat in the bag: `userId` (the chooser) gives it to a receiver. */
  | { kind: "pass"; userId: string; receivers: string[] }
  /** The buzzers are open: these players haven't buzzed in or passed. */
  | { kind: "buzz"; userIds: string[] }
  /** The Final: these players haven't sent their answer. */
  | { kind: "answer"; userIds: string[] }
  /** The Final nobody could wager on: show its answer (as `userId`). */
  | { kind: "reveal"; userId: string }
  /** The buzz winner (or the cat's receiver) marks their answer, or picks an
   * option on a multiple choice question (`choices`). */
  | { kind: "check"; userId: string; choices: boolean }
  /** The Final: these players haven't marked their answer. */
  | { kind: "checks"; userIds: string[] }
  /** The answer is shown: `userId` goes back to the board. */
  | { kind: "next"; userId: string };

const none: AdminStep = { kind: "none" };

/** canSkipOpenClue: the open question may be skipped (see SkipClue). */
export function canSkipOpenClue(state: Pick<State, "type" | "activeClue">) {
  return state.activeClue !== null && OPEN_QUESTION_STATES.has(state.type);
}

function isSingleLongFormBoard(state: Pick<State, "game" | "round">) {
  const board = state.game.boards.at(state.round);
  return (
    board?.categories.length === 1 &&
    board.categories[0].clues.length === 1 &&
    Boolean(board.categories[0].clues[0].longForm)
  );
}

/** getAdminStep finds what the game waits for from a player (see AdminStep).
 * Where any player may act (the Final), the board-control player (or else
 * the first player) is the one acted for. */
export function getAdminStep(state: State): AdminStep {
  const playerIds = Array.from(state.players.keys());
  const firstPlayer = playerIds.at(0);
  if (state.type === GameState.GameOver || !firstPlayer) {
    return { kind: "none" };
  }
  const controller =
    state.boardControl && state.players.has(state.boardControl)
      ? state.boardControl
      : undefined;
  const anyPlayer = controller ?? firstPlayer;
  const clue = state.activeClue
    ? state.game.boards
        .at(state.round)
        ?.categories.at(state.activeClue[1])
        ?.clues.at(state.activeClue[0])
    : undefined;
  const key = state.activeClue
    ? `${state.round},${state.activeClue[0]},${state.activeClue[1]}`
    : "";

  switch (state.type) {
    case GameState.PreviewRound:
      if (isSingleLongFormBoard(state)) {
        return { kind: "start", userId: anyPlayer };
      }
      return controller ? { kind: "start", userId: controller } : none;
    case GameState.ShowBoard:
      if (isSingleLongFormBoard(state)) {
        return { kind: "choose", userId: anyPlayer };
      }
      return controller ? { kind: "choose", userId: controller } : none;
    case GameState.WagerClue: {
      const wagers = state.wagers.get(key);
      return {
        kind: "wager",
        userIds: playerIds.filter(
          (id) => state.buzzes.get(id) !== CANT_BUZZ_FLAG && !wagers?.has(id),
        ),
      };
    }
    case GameState.PassClue:
      return controller
        ? {
            kind: "pass",
            userId: controller,
            receivers: playerIds.filter(
              (id) => id !== controller || playerIds.length === 1,
            ),
          }
        : none;
    case GameState.ReadClue:
    case GameState.ReadWagerableClue:
      return {
        kind: "buzz",
        userIds: playerIds.filter((id) => !state.buzzes.has(id)),
      };
    case GameState.ReadLongFormClue: {
      const pending = playerIds.filter((id) => !state.buzzes.has(id));
      const nobodyCanAnswer =
        state.buzzes.size === state.players.size &&
        Array.from(state.buzzes.values()).every((b) => b === CANT_BUZZ_FLAG);
      return nobodyCanAnswer
        ? { kind: "reveal", userId: anyPlayer }
        : { kind: "answer", userIds: pending };
    }
    case GameState.RevealAnswerToBuzzer: {
      const winner = getWinningBuzzer(
        state.buzzes,
        getStateTiebreakerSeed(state),
        getBuzzWindowMs(state),
      );
      return winner && state.players.has(winner.userId)
        ? {
            kind: "check",
            userId: winner.userId,
            choices: clue ? isAutoCheckedClue(clue) : false,
          }
        : none;
    }
    case GameState.RevealAnswerLongForm: {
      const answered = state.answers.get(key);
      const checked =
        state.activeClue &&
        state.isAnswered
          .at(state.round)
          ?.at(state.activeClue[0])
          ?.at(state.activeClue[1])?.answeredBy;
      return {
        kind: "checks",
        userIds: playerIds.filter(
          (id) => answered?.has(id) && !checked?.has(id),
        ),
      };
    }
    case GameState.RevealAnswerToAll:
      if (clue?.longForm) {
        return { kind: "next", userId: anyPlayer };
      }
      return controller ? { kind: "next", userId: controller } : none;
    default:
      return none;
  }
}
