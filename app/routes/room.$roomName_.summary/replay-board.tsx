import clsx from "clsx";
import * as React from "react";

import { Category } from "~/components/board/category";
import Popover from "~/components/popover";
import { clueIsPlayable } from "~/engine";
import type { Player } from "~/engine/state";
import { getPlayer } from "~/engine/state";
import type { Board, Clue, Game } from "~/models/convert.server";
import {
  formatDollars,
  formatDollarsWithSign,
  generateGrid,
  stringToHslColor,
} from "~/utils";
import type { ClueLookup, ReplayFrame } from "./replay";
import { buildClueLookup } from "./replay";

// https://stackoverflow.com/questions/70524820/is-there-still-no-easy-way-to-split-strings-with-compound-emojis-into-an-array
const COMPOUND_EMOJI_REGEX =
  /\p{RI}\p{RI}|\p{Emoji}(\p{EMod}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?(\u{200D}\p{Emoji}(\p{EMod}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?)*|./gsu;

function BuzzDots({
  playerIds,
  allPlayers,
}: {
  playerIds: string[];
  allPlayers: Player[];
}) {
  if (playerIds.length === 0) return null;

  return (
    <div className="absolute bottom-1 right-1 flex gap-0.5">
      {playerIds.map((userId) => {
        const player = allPlayers.find((p) => p.userId === userId);
        if (!player) return null;
        const bg = stringToHslColor(userId);
        const matches = player.name.match(COMPOUND_EMOJI_REGEX);
        const firstChar = matches ? matches[0] : player.name[0];
        return (
          <div
            key={userId}
            className="flex h-5 w-5 animate-fade-scale-in items-center justify-center rounded-full text-[10px] font-mono font-bold text-white"
            style={{ backgroundColor: bg }}
            title={player.name}
          >
            {firstChar}
          </div>
        );
      })}
    </div>
  );
}

function CluePopoverContent({
  clue,
  resolvedState,
  round,
  i,
  j,
}: {
  clue: Clue;
  resolvedState: ReplayFrame["state"];
  round: number;
  i: number;
  j: number;
}) {
  const key = `${round},${i},${j}`;
  const wagers = resolvedState.wagers.get(key);
  const answers = resolvedState.answers.get(key);
  const clueAnswer = resolvedState.isAnswered[round]?.[i]?.[j];

  if (!clueAnswer) return null;

  return (
    <div>
      <p>{clue.clue}</p>
      <p className="uppercase">{clue.answer}</p>
      {clue.wagerable && wagers ? (
        <div className="pt-2">
          {Array.from(wagers.entries()).map(([userId, wager]) => {
            const player = getPlayer(resolvedState, userId);
            if (!player) return null;
            const answer = answers?.get(userId);
            const correct = clueAnswer.answeredBy.get(userId) ?? false;
            return (
              <p key={userId} className="font-mono text-xs">
                {player.name} {formatDollarsWithSign(correct ? wager : -wager)}
                {answer ? `: "${answer}"` : ""}
              </p>
            );
          })}
        </div>
      ) : clueAnswer.answeredBy.size ? (
        <div className="pt-2">
          {Array.from(clueAnswer.answeredBy.entries()).map(
            ([userId, correct]) => {
              const player = getPlayer(resolvedState, userId);
              if (!player) return null;
              return (
                <p key={userId} className="font-mono text-xs">
                  {player.name}{" "}
                  {formatDollarsWithSign(correct ? clue.value : -clue.value)}
                </p>
              );
            },
          )}
        </div>
      ) : null}
    </div>
  );
}

interface ReplayClueProps {
  clue: Clue;
  round: number;
  i: number;
  j: number;
  currentFrameIndex: number;
  clueLookup: ClueLookup | undefined;
  allPlayers: Player[];
  /** The state from the Resolved frame, used for popover data. */
  resolvedState: ReplayFrame["state"] | undefined;
}

function ReplayClue({
  clue,
  round,
  i,
  j,
  currentFrameIndex,
  clueLookup,
  allPlayers,
  resolvedState,
}: ReplayClueProps) {
  const playable = clueIsPlayable(clue);

  // Unplayable clues are always greyed out
  if (!playable) {
    return (
      <td className="h-full sm:p-1">
        <div className="h-full w-full bg-slate-800 px-4 py-3" />
      </td>
    );
  }

  // Determine visual state based on current frame vs clue's frames
  const notReached = !clueLookup || currentFrameIndex < clueLookup.chosenFrameIndex;

  if (notReached) {
    return (
      <td className="h-full sm:p-1">
        <div className="h-full w-full border-2 border-transparent bg-blue-bright px-4 py-3">
          <p className="flex items-center justify-center font-inter font-bold text-yellow-1000 text-shadow-md sm:text-shadow-lg">
            <span className="text-sm sm:text-3xl lg:text-4xl">$</span>
            <span className="text-md sm:text-4xl lg:text-5xl">
              {clue.value}
            </span>
          </p>
        </div>
      </td>
    );
  }

  // Determine which phase we're in
  const isResolved =
    clueLookup.resolvedFrameIndex >= 0 &&
    currentFrameIndex >= clueLookup.resolvedFrameIndex;
  const isBuzzed =
    !isResolved &&
    clueLookup.buzzedFrameIndex !== null &&
    currentFrameIndex >= clueLookup.buzzedFrameIndex;
  const isChosen = !isResolved && !isBuzzed;

  // Show participants if we're at or past the buzzed frame
  const showParticipants =
    (isBuzzed || isResolved) && clueLookup.participantIds.length > 0;

  // Background color for resolved clues
  let backgroundColor: string | undefined;
  if (isResolved && clueLookup.correctUserId) {
    backgroundColor = stringToHslColor(clueLookup.correctUserId);
  }
  const isGreyedOut = isResolved && !clueLookup.correctUserId;

  const clueValue =
    clue.wagerable
      ? clue.longForm
        ? "Final"
        : "DD"
      : clue.value;

  const cellContent = (
    <div
      className={clsx(
        "relative h-full w-full border-2 border-transparent px-4 py-3 transition-all duration-300",
        {
          "bg-blue-bright": !isResolved,
          "animate-border-pulse": isChosen || isBuzzed,
          "bg-slate-800": isGreyedOut,
        },
      )}
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      <p
        className={clsx(
          "flex items-center justify-center font-inter font-bold text-white opacity-75 text-shadow-md sm:text-shadow-lg",
          {
            "text-yellow-1000": !isResolved,
          },
        )}
      >
        {clue.wagerable ? null : (
          <span className="text-sm sm:text-3xl lg:text-4xl">$</span>
        )}
        <span className="text-md sm:text-4xl lg:text-5xl">{clueValue}</span>
      </p>
      {showParticipants && (
        <BuzzDots
          playerIds={clueLookup.participantIds}
          allPlayers={allPlayers}
        />
      )}
    </div>
  );

  // Resolved clues get a popover
  if (isResolved && resolvedState) {
    return (
      <td className="h-full sm:p-1">
        <Popover
          content={
            <CluePopoverContent
              clue={clue}
              resolvedState={resolvedState}
              round={round}
              i={i}
              j={j}
            />
          }
        >
          <button className="h-full w-full text-left">{cellContent}</button>
        </Popover>
      </td>
    );
  }

  return <td className="h-full sm:p-1">{cellContent}</td>;
}

export function ReplayBoard({
  board,
  game,
  round,
  frames,
  currentFrameIndex,
  allPlayers,
}: {
  board: Board;
  game: Game;
  round: number;
  frames: ReplayFrame[];
  currentFrameIndex: number;
  allPlayers: Player[];
}) {
  const clueLookupMap = React.useMemo(() => buildClueLookup(frames), [frames]);

  // Build a map from "round,i,j" to the resolved frame's state for popovers
  const resolvedStateMap = React.useMemo(() => {
    const map = new Map<string, ReplayFrame["state"]>();
    for (const frame of frames) {
      if (frame.phase === "resolved") {
        const key = `${frame.round},${frame.clue[0]},${frame.clue[1]}`;
        map.set(key, frame.state);
      }
    }
    return map;
  }, [frames]);

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

  return (
    <table className="h-1 w-full table-fixed border-spacing-3 text-white">
      <thead>
        <tr className="h-1">
          {board.categories.map((category) => (
            <Category
              key={category.name}
              name={category.name}
              note={category.note}
            />
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((clue, j) => {
              if (!clue) return <td key={`clue-${i}-${j}`} />;
              const key = `${round},${i},${j}`;
              return (
                <ReplayClue
                  key={`clue-${i}-${j}`}
                  clue={clue}
                  round={round}
                  i={i}
                  j={j}
                  currentFrameIndex={currentFrameIndex}
                  clueLookup={clueLookupMap.get(key)}
                  allPlayers={allPlayers}
                  resolvedState={resolvedStateMap.get(key)}
                />
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ReplayScoreBar({
  allPlayers,
  currentState,
}: {
  allPlayers: Player[];
  currentState: ReplayFrame["state"] | undefined;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const positionsRef = React.useRef<Map<string, DOMRect>>(new Map());

  // Sort players by current score descending
  const sortedPlayers = React.useMemo(() => {
    if (!currentState) return allPlayers;
    return [...allPlayers].sort((a, b) => {
      const scoreA =
        (currentState.players.get(a.userId) ??
          currentState.leftPlayers.get(a.userId))?.score ?? 0;
      const scoreB =
        (currentState.players.get(b.userId) ??
          currentState.leftPlayers.get(b.userId))?.score ?? 0;
      return scoreB - scoreA;
    });
  }, [allPlayers, currentState]);

  // Build order map: userId -> visual index
  const orderMap = React.useMemo(
    () => new Map(sortedPlayers.map((p, i) => [p.userId, i])),
    [sortedPlayers],
  );

  // FLIP animation: after DOM update, animate from old positions to new
  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const children = Array.from(
      container.querySelectorAll<HTMLElement>("[data-user-id]"),
    );
    const newPositions = new Map<string, DOMRect>();

    for (const child of children) {
      const userId = child.dataset.userId!;
      newPositions.set(userId, child.getBoundingClientRect());
    }

    // Apply inverse transforms for any items that moved
    for (const child of children) {
      const userId = child.dataset.userId!;
      const oldRect = positionsRef.current.get(userId);
      const newRect = newPositions.get(userId);
      if (!oldRect || !newRect) continue;

      const deltaX = oldRect.left - newRect.left;
      const deltaY = oldRect.top - newRect.top;
      if (deltaX === 0 && deltaY === 0) continue;

      // Apply inverse transform (no transition)
      child.style.transition = "none";
      child.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

      // Force reflow
      child.getBoundingClientRect();

      // Animate to final position
      child.style.transition = "transform 300ms ease";
      child.style.transform = "";
    }

    positionsRef.current = newPositions;
  });

  if (!currentState) return null;

  return (
    <div
      ref={containerRef}
      className="flex flex-wrap justify-center gap-3 text-sm"
    >
      {allPlayers.map((p) => {
        const current =
          currentState.players.get(p.userId) ??
          currentState.leftPlayers.get(p.userId);
        if (!current) return null;
        return (
          <div
            key={p.userId}
            data-user-id={p.userId}
            className="flex items-center gap-1.5"
            style={{ order: orderMap.get(p.userId) ?? 0 }}
          >
            <div
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: stringToHslColor(p.userId) }}
            />
            <span className="text-slate-300">{current.name}</span>
            <span
              className={clsx(
                "font-mono font-bold",
                current.score < 0 ? "text-red-400" : "text-white",
              )}
            >
              {formatDollars(current.score)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
