import clsx from "clsx";
import * as React from "react";

import { Category } from "~/components/board/category";
import CluePopoverContent from "~/components/clue-popover-content";
import Popover from "~/components/popover";
import { clueIsPlayable } from "~/engine";
import type { Player } from "~/engine/state";
import type { Board, Clue, Game } from "~/models/convert.server";
import {
  formatDollars,
  generateGrid,
  stringToHslColor,
} from "~/utils";
import type { ClueLookup, ReplayFrame } from "./replay";
import { buildClueLookup } from "./replay";

// https://stackoverflow.com/questions/70524820/is-there-still-no-easy-way-to-split-strings-with-compound-emojis-into-an-array
const COMPOUND_EMOJI_REGEX =
  /\p{RI}\p{RI}|\p{Emoji}(\p{EMod}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?(\u{200D}\p{Emoji}(\p{EMod}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?)*|./gsu;

/** Max dots visible on small screens before showing "+N" overflow. */
const MAX_MOBILE_DOTS = 3;

function BuzzDots({
  playerIds,
  allPlayers,
}: {
  playerIds: string[];
  allPlayers: Player[];
}) {
  if (playerIds.length === 0) return null;

  const overflow = playerIds.length - MAX_MOBILE_DOTS;

  return (
    <div className="absolute bottom-0.5 right-0.5 flex gap-px sm:bottom-1 sm:right-1 sm:gap-0.5">
      {playerIds.map((userId, idx) => {
        const player = allPlayers.find((p) => p.userId === userId);
        if (!player) return null;
        const bg = stringToHslColor(userId);
        const matches = player.name.match(COMPOUND_EMOJI_REGEX);
        const firstChar = matches ? matches[0] : player.name[0];
        return (
          <div
            key={userId}
            className={clsx(
              "flex animate-fade-scale-in items-center justify-center rounded-full font-mono font-bold text-white",
              "h-3.5 w-3.5 text-[8px] sm:h-5 sm:w-5 sm:text-[10px]",
              idx >= MAX_MOBILE_DOTS && "hidden sm:flex",
            )}
            style={{ backgroundColor: bg }}
            title={player.name}
          >
            {firstChar}
          </div>
        );
      })}
      {overflow > 0 && (
        <div className="flex h-3.5 w-3.5 animate-fade-scale-in items-center justify-center rounded-full bg-slate-600 font-mono text-[8px] font-bold text-white sm:hidden">
          +{overflow}
        </div>
      )}
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
              state={resolvedState}
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
  playing,
}: {
  allPlayers: Player[];
  currentState: ReplayFrame["state"] | undefined;
  playing: boolean;
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

  // FLIP animation: only when playing, skip during scrubbing to avoid flyaway
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

    if (playing) {
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
        child.style.transition = "transform 300ms ease-out";
        child.style.transform = "";
      }
    } else {
      // Scrubbing: clear any in-flight transforms so items snap into place
      for (const child of children) {
        child.style.transition = "none";
        child.style.transform = "";
      }
    }

    positionsRef.current = newPositions;
  });

  if (!currentState) return null;

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center gap-2 text-sm sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3"
    >
      {allPlayers.map((p) => {
        const current =
          currentState.players.get(p.userId) ??
          currentState.leftPlayers.get(p.userId);
        if (!current) return null;
        const matches = current.name.match(COMPOUND_EMOJI_REGEX);
        const firstChar = matches ? matches[0] : current.name[0];
        return (
          <div
            key={p.userId}
            data-user-id={p.userId}
            className="flex items-center gap-1.5"
            style={{ order: orderMap.get(p.userId) ?? 0 }}
            title={current.name}
          >
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold text-white"
              style={{ backgroundColor: stringToHslColor(p.userId) }}
            >
              {firstChar}
            </div>
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
