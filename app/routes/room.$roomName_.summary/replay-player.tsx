import * as React from "react";

import type { Action, Player } from "~/engine";
import { stateFromGame } from "~/engine/state";
import type { Game } from "~/models/convert.server";
import { formatDollars } from "~/utils";
import { ReplayBoard, ReplayScoreBar } from "./replay-board";
import { ReplayControls } from "./replay-controls";
import { buildReplayFrames } from "./replay";
import { useReplay } from "./use-replay";

interface ReplayPlayerProps {
  game: Game;
  actions: Action[];
  allPlayers: Player[];
}

export default function ReplayPlayer({
  game,
  actions,
  allPlayers,
}: ReplayPlayerProps) {
  const frames = React.useMemo(
    () => buildReplayFrames(game, actions),
    [game, actions],
  );

  const {
    currentFrameIndex,
    playing,
    speed,
    play,
    pause,
    setFrame,
    setSpeed,
  } = useReplay(frames.length);

  const currentFrame =
    currentFrameIndex >= 0 ? frames[currentFrameIndex] : undefined;

  // Initial state for before replay starts
  const initialState = React.useMemo(() => {
    // Apply all non-clue events (joins, name changes, etc.) to get player info
    // but use the first frame's state if available, otherwise create initial
    if (frames.length > 0) {
      return frames[0].state;
    }
    return stateFromGame(game);
  }, [frames, game]);

  const displayState = currentFrame?.state ?? initialState;

  // Determine which round/board to show
  const displayRound = currentFrame?.round ?? 0;
  const board = game.boards[displayRound];

  // Build clue label
  const clueLabel = React.useMemo(() => {
    if (!currentFrame) return "Ready";
    if (
      currentFrameIndex === frames.length - 1 &&
      currentFrame.phase === "resolved"
    ) {
      // Check if this is the very last clue
      const nextFrameExists = currentFrameIndex + 1 < frames.length;
      if (!nextFrameExists) {
        return "Game Over";
      }
    }
    const [ci, cj] = currentFrame.clue;
    const category =
      game.boards[currentFrame.round]?.categories?.[cj];
    const clue = category?.clues?.[ci];
    if (!category || !clue) return "";
    const value = clue.wagerable
      ? clue.longForm
        ? "Final"
        : "DD"
      : formatDollars(clue.value);
    return `${category.name} for ${value}`;
  }, [currentFrame, currentFrameIndex, frames.length, game.boards]);

  // Compute frame indices where each new round starts (for scrubber tick marks)
  const roundBoundaries = React.useMemo(() => {
    const boundaries: number[] = [];
    for (let i = 1; i < frames.length; i++) {
      if (frames[i].round !== frames[i - 1].round) {
        boundaries.push(frames[i].index);
      }
    }
    return boundaries;
  }, [frames]);

  // Round transition banner
  const prevRoundRef = React.useRef<number | undefined>(undefined);
  const [showRoundBanner, setShowRoundBanner] = React.useState(false);
  const [bannerRound, setBannerRound] = React.useState(0);

  // Detect round changes
  const currRound = currentFrame?.round;
  React.useEffect(() => {
    if (
      currRound !== undefined &&
      prevRoundRef.current !== undefined &&
      currRound !== prevRoundRef.current
    ) {
      setBannerRound(currRound);
      setShowRoundBanner(true);
    }
    prevRoundRef.current = currRound;
  }, [currRound]);

  // Auto-dismiss banner — scales with playback speed, snappy when scrubbing
  React.useEffect(() => {
    if (!showRoundBanner) return;
    const durationMs = playing ? 1500 / speed : 500;
    const timer = setTimeout(() => setShowRoundBanner(false), durationMs);
    return () => clearTimeout(timer);
  }, [showRoundBanner, playing, speed]);

  // Keyboard shortcuts
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        playing ? pause() : play();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFrame(currentFrameIndex - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setFrame(currentFrameIndex + 1);
      }
    },
    [playing, play, pause, setFrame, currentFrameIndex],
  );

  if (!board) return null;

  return (
    <div
      className="relative flex flex-col gap-4 outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Board + round banner wrapper */}
      <div className="relative">
        {showRoundBanner && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-blue-1000/80 animate-content-show">
            <h2 className="font-inter text-4xl font-bold text-white text-shadow-lg">
              Round {bannerRound + 1}
            </h2>
          </div>
        )}
        <ReplayBoard
        board={board}
        game={game}
        round={displayRound}
        frames={frames}
        currentFrameIndex={currentFrameIndex}
        allPlayers={allPlayers}
      />
      </div>

      <ReplayControls
        playing={playing}
        speed={speed}
        currentFrame={currentFrameIndex}
        totalFrames={frames.length}
        clueLabel={clueLabel}
        roundBoundaries={roundBoundaries}
        onPlay={play}
        onPause={pause}
        onSeek={setFrame}
        onSpeedChange={setSpeed}
      />

      <ReplayScoreBar allPlayers={allPlayers} currentState={displayState} />
    </div>
  );
}
