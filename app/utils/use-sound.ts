import * as React from "react";

interface SoundSettings {
  /** volume is a number between 0 and 1. */
  volume: number;
  mute: boolean;
  /** ttsEnabled controls whether clue audio (text-to-speech) plays. Separate
   * from mute so players can keep SFX on but disable TTS (e.g. on a voice
   * call).
   */
  ttsEnabled: boolean;
  setVolume: (volume: number) => void;
  setMute: (mute: boolean) => void;
  setTtsEnabled: (enabled: boolean) => void;
}

/** SoundContext stores the volume and mute settings for all sound effects
 * in the game.
 */
export const SoundContext = React.createContext<SoundSettings>({
  volume: 1,
  mute: false,
  ttsEnabled: false,
  setVolume: () => null,
  setMute: () => null,
  setTtsEnabled: () => null,
});

export function useSoundContext() {
  return React.useContext(SoundContext);
}

/** useGameSound uses the sound settings from the context to play a sound. */
export default function useGameSound(
  src: string,
): [() => void, { stop: () => void }] {
  const { volume, mute } = useSoundContext();
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    audioRef.current = new Audio(src);
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [src]);

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const play = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio || mute) return;
    // interrupt: restart if already playing
    audio.currentTime = 0;
    audio.play();
  }, [mute]);

  const stop = React.useCallback(() => {
    audioRef.current?.pause();
  }, []);

  return [play, { stop }];
}
