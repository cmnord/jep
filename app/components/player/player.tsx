import clsx from "clsx";
import * as React from "react";

import Popover from "~/components/popover";
import { UndoArmingContext, UndoCheckConfirm } from "~/components/undo-check";
import type { Player } from "~/engine";
import { GameState, useEngineContext } from "~/engine";
import { formatDollars, getPlayerColor } from "~/utils";

import { RoomProps } from "../game";
import { EditPlayerForm } from "./edit-player";
import { KickablePlayerIcon } from "./kick-player";

// https://stackoverflow.com/questions/70524820/is-there-still-no-easy-way-to-split-strings-with-compound-emojis-into-an-array
const COMPOUND_EMOJI_REGEX =
  /\p{RI}\p{RI}|\p{Emoji}(\p{EMod}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?(\u{200D}\p{Emoji}(\p{EMod}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?)*|./gsu;

/** ScorePulse marks a score that just changed due to a check correction. */
export type ScorePulse = "up" | "down";

/** PlayerScoreBox contains a player icon and their score. */
export function PlayerScoreBox({
  player,
  hasBoardControl,
  children,
  winning,
  icon,
  scorePopover,
  scorePopoverKey,
  scorePopoverAutoOpen,
  pulse,
}: {
  player: Player;
  hasBoardControl: boolean;
  children: React.ReactNode;
  winning: boolean;
  icon?: React.ReactNode;
  /** When set, the score becomes a popover trigger (used to undo a check on
   * the latest clue). */
  scorePopover?: React.ReactNode;
  /** Changes when the correction is applied, closing the popover. */
  scorePopoverKey?: boolean;
  /** Open the popover without a tap — used when an armed undo confirmation
   * from the reveal screen follows the player to the board. */
  scorePopoverAutoOpen?: boolean;
  pulse?: ScorePulse;
}) {
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const { setArmed } = React.useContext(UndoArmingContext);
  const onPopoverOpenChange = (open: boolean) => {
    setPopoverOpen(open);
    // Closing the popover abandons any armed-but-uncommitted correction
    // (which, at game over, releases the held summary navigation).
    if (!open) {
      setArmed(false);
    }
  };
  React.useEffect(() => {
    setPopoverOpen(false);
  }, [scorePopoverKey]);
  React.useEffect(() => {
    if (scorePopoverAutoOpen) {
      setPopoverOpen(true);
    }
  }, [scorePopoverAutoOpen]);

  const score = (
    <div
      className={clsx("font-inter font-bold text-shadow-md", {
        "text-white": player.score >= 0,
        "text-red-400": player.score < 0,
        // The decoration must live on the text itself: Safari doesn't
        // propagate text-decoration from a <button> into its children.
        // The decoration color must be opaque: WebKit drops a
        // semi-transparent decoration entirely when the text has a
        // text-shadow, leaving only the dots' black shadows visible.
        "underline decoration-white decoration-dotted decoration-2 underline-offset-4":
          Boolean(scorePopover),
      })}
    >
      {formatDollars(player.score)}
    </div>
  );
  return (
    <div
      className={clsx("flex gap-2 rounded-xl p-2 sm:p-3", {
        "bg-white/5": !hasBoardControl,
        "bg-blue-700": hasBoardControl,
        "animate-score-pulse-green": pulse === "up",
        "animate-score-pulse-red": pulse === "down",
      })}
    >
      {icon ?? <PlayerIcon player={player} />}
      <div className="w-full">
        {children}
        <div className="flex w-1/3 grow items-center justify-end gap-2 text-xl sm:w-auto">
          {winning && <span>👑</span>}
          {scorePopover ? (
            <Popover
              content={scorePopover}
              open={popoverOpen}
              onOpenChange={onPopoverOpenChange}
            >
              <button
                type="button"
                className="cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {score}
              </button>
            </Popover>
          ) : (
            score
          )}
        </div>
      </div>
    </div>
  );
}

/** PlayerScore is a presentational component showing the player's icon, name,
 * and score.
 */
export function PlayerScore({
  player,
  hasBoardControl,
  winning,
  icon,
  scorePopover,
  scorePopoverKey,
  scorePopoverAutoOpen,
  pulse,
}: {
  player: Player;
  hasBoardControl: boolean;
  winning: boolean;
  icon?: React.ReactNode;
  scorePopover?: React.ReactNode;
  scorePopoverKey?: boolean;
  scorePopoverAutoOpen?: boolean;
  pulse?: ScorePulse;
}) {
  return (
    <PlayerScoreBox
      hasBoardControl={hasBoardControl}
      player={player}
      winning={winning}
      icon={icon}
      scorePopover={scorePopover}
      scorePopoverKey={scorePopoverKey}
      scorePopoverAutoOpen={scorePopoverAutoOpen}
      pulse={pulse}
    >
      <div className="flex w-full gap-2 text-2xl">
        <p className="font-handwriting font-bold text-slate-300">
          {player.name}
        </p>
      </div>
    </PlayerScoreBox>
  );
}

/** PlayerIcon is a round bubble with the first character of the player's name in
 * it.
 */
export function PlayerIcon({
  player,
}: {
  player: Pick<Player, "name" | "userId" | "color">;
}) {
  const backgroundColor = getPlayerColor(player);
  const matches = player.name.match(COMPOUND_EMOJI_REGEX);
  const firstChar = matches ? matches[0] : player.name[0];
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor }}
      title={player.name}
    >
      <div className="text-md font-mono font-bold text-white">{firstChar}</div>
    </div>
  );
}

function getMaxScore(others: Player[], you?: Player) {
  const bestOther = others.at(0);
  if (bestOther && you) {
    return Math.max(bestOther.score, you.score);
  } else if (bestOther) {
    return bestOther.score;
  } else if (you) {
    return you.score;
  }
  return 0;
}

/** useCorrectionPulses watches the check-correction record and reports which
 * players' scores just changed because a check was corrected (as opposed to
 * ordinary scoring). Corrections flip the value of an existing check; new
 * checks on the same clue add entries instead.
 */
function useCorrectionPulses() {
  const { players, checkCorrection } = useEngineContext();
  const [pulses, setPulses] = React.useState<Map<string, ScorePulse>>(
    new Map(),
  );
  const prevRef = React.useRef<{
    scores: Map<string, number>;
    checksKey: string;
    checks: Map<string, boolean>;
  } | null>(null);

  const checksKey = checkCorrection
    ? `${checkCorrection.round},${checkCorrection.i},${checkCorrection.j}`
    : "";

  React.useEffect(() => {
    const scores = new Map(
      Array.from(players.values(), (p) => [p.userId, p.score]),
    );
    const checks = checkCorrection
      ? new Map(checkCorrection.checks)
      : new Map<string, boolean>();
    const prev = prevRef.current;
    prevRef.current = { scores, checksKey, checks };

    if (!prev || !checkCorrection || prev.checksKey !== checksKey) {
      return;
    }
    const flipped =
      checks.size === prev.checks.size &&
      Array.from(checks).some(
        ([uid, correct]) =>
          prev.checks.has(uid) && prev.checks.get(uid) !== correct,
      );
    if (!flipped) {
      return;
    }

    const changed = new Map<string, ScorePulse>();
    for (const [uid, score] of scores) {
      const prevScore = prev.scores.get(uid);
      if (prevScore !== undefined && prevScore !== score) {
        changed.set(uid, score > prevScore ? "up" : "down");
      }
    }
    if (changed.size) {
      setPulses(changed);
    }
  }, [players, checkCorrection, checksKey]);

  // Remove the pulse classes once the animation has played so a later
  // correction can re-trigger them.
  React.useEffect(() => {
    if (!pulses.size) {
      return;
    }
    const timeout = setTimeout(() => setPulses(new Map()), 1700);
    return () => clearTimeout(timeout);
  }, [pulses]);

  return pulses;
}

/** PlayerScores is a connected component that:
 * - Lets the current player edit their name
 * - Shows each player's name and score
 * - Lets the current player undo their check on the latest clue by tapping
 *   their score
 */
export function PlayerScores({ roomId, userId }: RoomProps) {
  const {
    players,
    boardControl,
    type,
    round,
    numAnswered,
    getCheckCorrection,
  } = useEngineContext();

  const yourPlayer = players.get(userId);

  const pulses = useCorrectionPulses();

  // If the player armed the undo confirmation on the reveal screen and
  // another player advanced before they committed, re-open the confirmation
  // here so it isn't yanked away mid-decision. This includes game over: the
  // correction record survives it, and staying armed holds this client's
  // navigation to the summary until the popover closes or commits.
  const { armed: undoArmed, setArmed: setUndoArmed } =
    React.useContext(UndoArmingContext);
  const pickUpArmedUndo =
    undoArmed && (type === GameState.ShowBoard || type === GameState.GameOver);
  React.useEffect(() => {
    if (undoArmed && type === GameState.ShowBoard) {
      setUndoArmed(false);
    }
  }, [undoArmed, type, setUndoArmed]);

  // sort all other players from highest to lowest score
  const sortedOtherPlayers = Array.from(players.values())
    .filter((p) => p.userId !== userId)
    .sort((a, b) => b.score - a.score);

  const maxScore = getMaxScore(sortedOtherPlayers, yourPlayer);

  const editable =
    type !== GameState.GameOver &&
    (type !== GameState.PreviewRound || round !== 0);

  const onBoard =
    type === GameState.ShowBoard || type === GameState.PreviewRound;

  // Kick others: only before game starts
  const canKick =
    onBoard && numAnswered === 0 && round === 0 && players.size > 1;

  // Leave self: any time the board or round preview is showing
  const canLeave = onBoard && players.size > 1;

  const kickIcon = (player: Player, isSelf: boolean) =>
    (isSelf ? canLeave : canKick) ? (
      <KickablePlayerIcon player={player} roomId={roomId} isSelf={isSelf} />
    ) : undefined;

  // Your score is tappable while your check on the latest clue can still be
  // corrected.
  const correction = getCheckCorrection(userId);
  const scorePopover = correction ? (
    <UndoCheckConfirm
      roomId={roomId}
      userId={userId}
      prompt="Undo your check on the last clue?"
      commitType="default"
    />
  ) : undefined;

  return (
    <div className="flex flex-col gap-2 sm:grid sm:grid-cols-3">
      {yourPlayer ? (
        editable ? (
          <EditPlayerForm
            roomId={roomId}
            userId={userId}
            winning={yourPlayer.score === maxScore}
            icon={kickIcon(yourPlayer, true)}
            scorePopover={scorePopover}
            scorePopoverKey={correction?.correct}
            scorePopoverAutoOpen={pickUpArmedUndo}
            pulse={pulses.get(yourPlayer.userId)}
          />
        ) : (
          <PlayerScore
            player={yourPlayer}
            hasBoardControl={yourPlayer.userId === boardControl}
            winning={yourPlayer.score === maxScore}
            icon={kickIcon(yourPlayer, true)}
            scorePopover={scorePopover}
            scorePopoverKey={correction?.correct}
            scorePopoverAutoOpen={pickUpArmedUndo}
            pulse={pulses.get(yourPlayer.userId)}
          />
        )
      ) : null}
      {sortedOtherPlayers.map((p) => (
        <PlayerScore
          key={p.userId}
          player={p}
          hasBoardControl={p.userId === boardControl}
          winning={p.score === maxScore}
          icon={kickIcon(p, false)}
          pulse={pulses.get(p.userId)}
        />
      ))}
    </div>
  );
}
