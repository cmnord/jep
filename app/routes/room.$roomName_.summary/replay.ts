import { produce } from "immer";

import type { Action } from "~/engine";
import { ActionType, gameEngine } from "~/engine";
import { isCorrectCheckAction } from "~/engine/actions";
import type { State } from "~/engine/state";
import { stateFromGame } from "~/engine/state";
import type { Game } from "~/models/convert.server";

function hasUserId(p: unknown): p is { userId: string } {
  return (
    typeof p === "object" &&
    p !== null &&
    "userId" in p &&
    typeof p.userId === "string"
  );
}

/** The visual phase of a clue in the replay. */
export enum CluePhase {
  /** Clue was just chosen -- highlight it with a border flash. */
  Chosen = "chosen",
  /** Players have buzzed or answered -- show colored dots on the clue. */
  Buzzed = "buzzed",
  /** Clue is resolved -- fill with winner color or grey out. */
  Resolved = "resolved",
}

export interface ReplayFrame {
  /** Index of this frame in the global timeline (0-based). */
  index: number;
  /** The round this frame belongs to. */
  round: number;
  /** The clue coordinates [i, j] this frame is about. */
  clue: [number, number];
  /** The visual phase. */
  phase: CluePhase;
  /** The full engine State after applying all events up to this frame. */
  state: State;
  /** Which userIds participated on this clue (buzzed or answered). */
  participantIds: string[];
  /** The userId who answered correctly, or null if nobody did. */
  correctUserId: string | null;
}

export interface ClueLookup {
  chosenFrameIndex: number;
  buzzedFrameIndex: number | null;
  resolvedFrameIndex: number;
  participantIds: string[];
  correctUserId: string | null;
}

/** Build an array of replay frames by stepping through all actions. */
export function buildReplayFrames(
  game: Game,
  actions: Action[],
): ReplayFrame[] {
  const frames: ReplayFrame[] = [];
  let state = stateFromGame(game);
  let frameIndex = 0;

  // Track per-clue accumulated data
  let currentClue: [number, number] | null = null;
  let participantIds: string[] = [];

  for (const action of actions) {
    const prevNumAnswered = state.numAnswered;
    const prevRound = state.round;
    const prevState = state;

    state = gameEngine(state, action);

    // When the round changes, numAnswered resets. Account for this.
    const roundChanged = state.round !== prevRound;

    // Frame 1: ChooseClue -> Chosen phase
    if (action.type === ActionType.ChooseClue && state.activeClue) {
      currentClue = state.activeClue;
      participantIds = [];
      frames.push({
        index: frameIndex++,
        round: state.round,
        clue: [currentClue[0], currentClue[1]],
        phase: CluePhase.Chosen,
        state,
        participantIds: [],
        correctUserId: null,
      });
    }

    // Accumulate participant info (Buzz and Answer events)
    if (
      (action.type === ActionType.Buzz || action.type === ActionType.Answer) &&
      currentClue &&
      hasUserId(action.payload)
    ) {
      if (!participantIds.includes(action.payload.userId)) {
        participantIds.push(action.payload.userId);
      }
    }

    // Frame 2 & 3: When numAnswered increases (clue resolved)
    const clueResolved =
      !roundChanged && state.numAnswered > prevNumAnswered && currentClue;
    // Also handle round change which means clue resolved AND round advanced
    const clueResolvedViaRoundChange =
      roundChanged && currentClue && state.numAnswered === 0;

    if ((clueResolved || clueResolvedViaRoundChange) && currentClue) {
      // Determine which round's isAnswered to look at
      const resolveRound = roundChanged ? prevRound : state.round;
      const [ci, cj] = currentClue;
      const clueAnswer = state.isAnswered[resolveRound]?.[ci]?.[cj];

      // Find correct player
      let correctUserId: string | null = null;
      if (clueAnswer) {
        for (const [userId, correct] of clueAnswer.answeredBy) {
          if (correct) {
            correctUserId = userId;
            break;
          }
        }
      }

      // Buzzed frame (only if there were participants to show)
      if (participantIds.length > 0) {
        frames.push({
          index: frameIndex++,
          round: resolveRound,
          clue: [currentClue[0], currentClue[1]],
          phase: CluePhase.Buzzed,
          state,
          participantIds: [...participantIds],
          correctUserId: null,
        });
      }

      // Resolved frame
      frames.push({
        index: frameIndex++,
        round: resolveRound,
        clue: [currentClue[0], currentClue[1]],
        phase: CluePhase.Resolved,
        state,
        participantIds: [...participantIds],
        correctUserId,
      });

      currentClue = null;
      participantIds = [];
    }

    // A correction after resolution rewrites scores, answeredBy, and board
    // control without emitting new frames, so update the already-emitted
    // Buzzed/Resolved frames for that clue in place. Only the
    // correction-derived data is patched into the historical snapshot —
    // replacing it wholesale would leak later joins, leaves, and renames
    // into frames recorded before they happened. (A correction during the
    // long-form reveal lands before any frames exist for the clue; the
    // frames it eventually emits use the corrected state.)
    // Only an accepted correction counts: the reducer returns the same
    // state reference for rejected ones (e.g. a stale event stored after
    // the window closed), and patching on those could copy unrelated
    // in-flight scores into historical frames.
    if (isCorrectCheckAction(action) && state !== prevState) {
      const { round, i, j } = action.payload;
      const clueAnswer = state.isAnswered[round]?.[i]?.[j];
      let correctedUserId: string | null = null;
      if (clueAnswer) {
        for (const [userId, correct] of clueAnswer.answeredBy) {
          if (correct) {
            correctedUserId = userId;
            break;
          }
        }
      }
      for (let f = frames.length - 1; f >= 0; f--) {
        const frame = frames[f];
        if (
          frame.round !== round ||
          frame.clue[0] !== i ||
          frame.clue[1] !== j ||
          frame.phase === CluePhase.Chosen
        ) {
          break;
        }
        const patchedState = produce(frame.state, (draft) => {
          const frameClue = draft.isAnswered[round]?.[i]?.[j];
          const affectedUserIds = new Set([
            ...(frameClue?.answeredBy.keys() ?? []),
            ...(clueAnswer?.answeredBy.keys() ?? []),
          ]);
          for (const userId of affectedUserIds) {
            const target =
              draft.players.get(userId) ?? draft.leftPlayers.get(userId);
            const source =
              state.players.get(userId) ?? state.leftPlayers.get(userId);
            if (target && source) {
              target.score = source.score;
            }
          }
          if (frameClue && clueAnswer) {
            frameClue.answeredBy = new Map(clueAnswer.answeredBy);
          }
          draft.boardControl = state.boardControl;
        });
        frames[f] = {
          ...frame,
          state: patchedState,
          correctUserId:
            frame.phase === CluePhase.Resolved
              ? correctedUserId
              : frame.correctUserId,
        };
      }
    }
  }

  return frames;
}

/** Build a lookup map from "round,i,j" to clue frame info for fast per-cell queries. */
export function buildClueLookup(
  frames: ReplayFrame[],
): Map<string, ClueLookup> {
  const map = new Map<string, ClueLookup>();

  for (const frame of frames) {
    const key = `${frame.round},${frame.clue[0]},${frame.clue[1]}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        chosenFrameIndex: frame.index,
        buzzedFrameIndex: frame.phase === CluePhase.Buzzed ? frame.index : null,
        resolvedFrameIndex:
          frame.phase === CluePhase.Resolved ? frame.index : -1,
        participantIds: frame.participantIds,
        correctUserId: frame.correctUserId,
      });
    } else {
      if (frame.phase === CluePhase.Buzzed) {
        existing.buzzedFrameIndex = frame.index;
        existing.participantIds = frame.participantIds;
      }
      if (frame.phase === CluePhase.Resolved) {
        existing.resolvedFrameIndex = frame.index;
        existing.correctUserId = frame.correctUserId;
        existing.participantIds = frame.participantIds;
      }
    }
  }

  return map;
}
