import * as React from "react";
import { useFetcher } from "react-router";

import Button from "~/components/button";
import type { RoomProps } from "~/components/game";
import { ArrowUturnLeft } from "~/components/icons";
import type { Action } from "~/engine";
import { GameState, useEngineContext } from "~/engine";
import { GAME_OVER_CORRECTION_GRACE_MS } from "~/engine/state";
import { formatDollarsWithSign } from "~/utils";
import useSoloAction from "~/utils/use-solo-action";
import useTimeout from "~/utils/use-timeout";

/** Disable the commit button briefly after arming so a double-tap on the
 * undo button can't arm and commit in one motion.
 */
const COMMIT_DEBOUNCE_MS = 400;

/** UndoArmingContext tracks whether this player has armed the undo
 * confirmation. The auto-advance timer runs on the board controller's
 * client, so another player's armed confirmation can be unmounted when the
 * game returns to the board; this context lets the board surface pick the
 * confirmation back up (by opening the score popover) instead of losing it.
 */
export const UndoArmingContext = React.createContext<{
  armed: boolean;
  setArmed: (armed: boolean) => void;
}>({ armed: false, setArmed: () => {} });

export function UndoArmingProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [armed, setArmed] = React.useState(false);

  // Disarm when the correction window moves to a different clue or closes
  // (so a stale confirmation can't reappear on a later clue), and when this
  // player's recorded check flips (the correction was applied, from any
  // surface). Mounting alone never disarms: an armed confirmation survives
  // screen changes like the long-form reveal completing or the round
  // preview opening.
  const { checkCorrection, getCheckCorrection } = useEngineContext();
  const clueKey = checkCorrection
    ? `${checkCorrection.round},${checkCorrection.i},${checkCorrection.j}`
    : null;
  const correct = getCheckCorrection(userId)?.correct;
  const prev = React.useRef({ clueKey, correct });
  React.useEffect(() => {
    if (prev.current.clueKey !== clueKey || prev.current.correct !== correct) {
      setArmed(false);
    }
    prev.current = { clueKey, correct };
  }, [clueKey, correct]);

  // After game over the engine only accepts corrections within the grace
  // period, so expire the armed confirmation (and release the held summary
  // navigation) when it ends instead of offering an action the engine
  // would silently ignore. The countdown runs on this client's clock from
  // the moment it observes game over, so a skewed browser clock can't
  // expire it early or keep it alive late relative to what this client saw.
  const { type } = useEngineContext();
  const gameOverObservedAt = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (type === GameState.GameOver) {
      gameOverObservedAt.current ??= Date.now();
    } else {
      gameOverObservedAt.current = null;
    }
  }, [type]);
  React.useEffect(() => {
    if (!armed || type !== GameState.GameOver) {
      return;
    }
    const observedAt = (gameOverObservedAt.current ??= Date.now());
    const remainingMs = observedAt + GAME_OVER_CORRECTION_GRACE_MS - Date.now();
    if (remainingMs <= 0) {
      setArmed(false);
      return;
    }
    const timeout = setTimeout(() => setArmed(false), remainingMs);
    return () => clearTimeout(timeout);
  }, [armed, type]);

  const value = React.useMemo(() => ({ armed, setArmed }), [armed]);
  return (
    <UndoArmingContext.Provider value={value}>
      {children}
    </UndoArmingContext.Provider>
  );
}

/** UndoCheckButton arms the undo confirmation. It never commits anything on
 * its own, so it's safe to place alongside other actions.
 */
export function UndoCheckButton({ onClick }: { onClick: () => void }) {
  return (
    <Button htmlType="button" onClick={onClick}>
      <ArrowUturnLeft className="h-4 w-4" />
      undo
    </Button>
  );
}

/** UndoCheckConfirm asks a one-line question and commits the correction. The
 * dollar amount — double the counted value or wager — appears here, at the
 * moment of commitment, and nowhere else.
 */
export function UndoCheckConfirm({
  roomId,
  userId,
  prompt,
  onCancel,
  commitType = "primary",
}: {
  prompt: string;
  /** When set, renders a "cancel" button. Omit inside popovers, where
   * tapping outside dismisses instead. */
  onCancel?: () => void;
  /** Use "default" on blue popover backgrounds where a primary button would
   * blend in. */
  commitType?: "primary" | "default";
} & RoomProps) {
  const { getCheckCorrection, soloDispatch } = useEngineContext();
  const correction = getCheckCorrection(userId);
  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);
  const loading = fetcher.state === "loading";

  // The commit button sits where the arming button was, so it keeps its
  // position on screen; briefly disable it so a double-tap can't commit.
  const [justArmed, setJustArmed] = React.useState(true);
  useTimeout(() => setJustArmed(false), justArmed ? COMMIT_DEBOUNCE_MS : null);

  if (!correction) {
    return null;
  }

  const nextCorrect = !correction.correct;
  const scoreSwing = correction.value * 2 * (nextCorrect ? 1 : -1);
  const result = nextCorrect ? "correct" : "incorrect";

  return (
    <fetcher.Form
      method="POST"
      action={`/room/${roomId}/correct-check`}
      className="flex flex-col items-center gap-2"
    >
      <input type="hidden" name="round" value={correction.round} />
      <input type="hidden" name="i" value={correction.i} />
      <input type="hidden" name="j" value={correction.j} />
      <input type="hidden" name="userId" value={userId} />
      <p className="font-bold text-white">{prompt}</p>
      <div className="flex gap-2">
        <Button
          type={commitType}
          htmlType="submit"
          name="result"
          value={result}
          loading={loading}
          disabled={justArmed}
        >
          <ArrowUturnLeft className="h-4 w-4" />
          undo ({formatDollarsWithSign(scoreSwing)})
        </Button>
        {onCancel ? (
          <Button htmlType="button" onClick={onCancel}>
            cancel
          </Button>
        ) : null}
      </div>
    </fetcher.Form>
  );
}
