import * as React from "react";
import useSound from "use-sound";

interface SoundSettings {
  /** volume is a number between 0 and 1. */
  volume: number;
  mute: boolean;
  setVolume: (volume: number) => void;
  setMute: (mute: boolean) => void;
}

/** SoundContext stores the volume and mute settings for all sound effects
 * in the game.
 */
export const SoundContext = React.createContext<SoundSettings>({
  volume: 1,
  mute: false,
  setVolume: () => null,
  setMute: () => null,
});

export function useSoundContext() {
  return React.useContext(SoundContext);
}

/** useGameSound uses the sound settings from the context to play a sound. */
export default function useGameSound(src: string) {
  const soundContext = useSoundContext();
  return useSound<unknown>(src, {
    volume: soundContext.volume,
    interrupt: true,
    soundEnabled: !soundContext.mute,
  });
}
