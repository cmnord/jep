import { useCallback, useEffect, useRef, useState } from "react";

export type Speed = 1 | 2 | 4;

/** Base interval per frame at 1x speed (milliseconds). */
const BASE_INTERVAL_MS = 1000;

export interface UseReplayReturn {
  /** Current frame index, or -1 if before the first frame. */
  currentFrameIndex: number;
  playing: boolean;
  speed: Speed;
  play: () => void;
  pause: () => void;
  setFrame: (index: number) => void;
  setSpeed: (speed: Speed) => void;
}

export function useReplay(totalFrames: number): UseReplayReturn {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const totalFramesRef = useRef(totalFrames);
  totalFramesRef.current = totalFrames;

  useEffect(() => {
    if (!playing || totalFrames === 0) return;

    const intervalMs = BASE_INTERVAL_MS / speed;
    const intervalId = setInterval(() => {
      setCurrentFrameIndex((prev) => {
        const next = prev + 1;
        if (next >= totalFramesRef.current) {
          setPlaying(false);
          return totalFramesRef.current - 1;
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [playing, speed, totalFrames]);

  const play = useCallback(() => {
    if (totalFrames === 0) return;
    // If at the end, restart from the beginning
    setCurrentFrameIndex((prev) => {
      if (prev >= totalFrames - 1) {
        return -1;
      }
      return prev;
    });
    setPlaying(true);
  }, [totalFrames]);

  const pause = useCallback(() => {
    setPlaying(false);
  }, []);

  const seekTo = useCallback(
    (index: number) => {
      setCurrentFrameIndex(Math.max(-1, Math.min(index, totalFrames - 1)));
    },
    [totalFrames],
  );

  return {
    currentFrameIndex,
    playing,
    speed,
    play,
    pause,
    setFrame: seekTo,
    setSpeed,
  };
}
