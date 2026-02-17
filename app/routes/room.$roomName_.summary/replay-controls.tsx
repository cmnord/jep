import * as Slider from "@radix-ui/react-slider";
import * as Toggle from "@radix-ui/react-toggle";
import clsx from "clsx";

import * as DropdownMenu from "~/components/dropdown-menu";
import { Pause, Play } from "~/components/icons";
import type { Speed } from "./use-replay";

const SPEEDS: Speed[] = [1, 2, 4];

interface ReplayControlsProps {
  playing: boolean;
  speed: Speed;
  currentFrame: number;
  totalFrames: number;
  clueLabel: string;
  /** Frame indices where new rounds start, used for scrubber tick marks. */
  roundBoundaries: number[];
  onPlay: () => void;
  onPause: () => void;
  onSeek: (index: number) => void;
  onSpeedChange: (speed: Speed) => void;
}

export function ReplayControls({
  playing,
  speed,
  currentFrame,
  totalFrames,
  clueLabel,
  roundBoundaries,
  onPlay,
  onPause,
  onSeek,
  onSpeedChange,
}: ReplayControlsProps) {
  const disabled = totalFrames === 0;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white/5 px-4 py-3 sm:gap-4">
      {/* Play/Pause — always on the same line as scrubber */}
      <Toggle.Root
        pressed={playing}
        onPressedChange={(pressed) => (pressed ? onPlay() : onPause())}
        disabled={disabled}
        aria-label={playing ? "Pause replay" : "Play replay"}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {playing ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5" />
        )}
      </Toggle.Root>

      {/* Scrubber — fills remaining space on the play/pause line */}
      <div className="min-w-0 flex-1">
        <Slider.Root
          className="relative flex h-5 w-full touch-none items-center select-none"
          value={[currentFrame]}
          min={-1}
          max={totalFrames - 1}
          step={1}
          disabled={disabled}
          onValueChange={([val]) => onSeek(val)}
          aria-label="Replay timeline"
        >
          <Slider.Track className="relative h-1 w-full grow rounded-full bg-white/20">
            <Slider.Range className="absolute h-full rounded-full bg-blue-500" />
            {/* Round boundary tick marks */}
            {totalFrames > 1 &&
              roundBoundaries.map((boundary) => {
                const pct =
                  ((boundary - (-1)) / (totalFrames - 1 - (-1))) * 100;
                return (
                  <button
                    key={boundary}
                    type="button"
                    className="absolute top-1/2 z-[1] h-3 w-0.5 -translate-y-1/2 rounded-full bg-white/50 transition-colors hover:bg-white"
                    style={{ left: `${pct}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSeek(boundary);
                    }}
                    aria-label={`Jump to round boundary`}
                    tabIndex={-1}
                  />
                );
              })}
          </Slider.Track>
          <Slider.Thumb className="block h-4 w-4 rounded-full bg-white shadow-md transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </Slider.Root>
      </div>

      {/* Clue label — wraps to second line on narrow screens */}
      <p className="min-w-0 truncate text-sm text-slate-300 sm:max-w-48">
        {clueLabel}
      </p>

      {/* Speed selector */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className="shrink-0 rounded px-2 py-1 font-mono text-sm text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            aria-label={`Playback speed: ${speed}x`}
          >
            {speed}x
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end">
            <DropdownMenu.Label className="p-1 text-xs text-slate-400">
              Speed
            </DropdownMenu.Label>
            {SPEEDS.map((s) => (
              <DropdownMenu.Item key={s} onSelect={() => onSpeedChange(s)}>
                <span
                  className={clsx(
                    "font-mono",
                    speed === s ? "text-white" : "text-slate-400",
                  )}
                >
                  {speed === s ? "\u2713 " : "  "}
                  {s}x
                </span>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
