import * as React from "react";

import { SUPABASE_URL } from "~/utils";

import { useSoundContext } from "./use-sound";

const TTS_BUCKET = "tts";

/** useClueAudio plays the pre-generated TTS audio for a clue when the
 * component mounts. Respects the TTS toggle and volume/mute settings from
 * SoundContext.
 *
 * If the audio file doesn't exist (game was uploaded without TTS, or TTS
 * generation failed for this clue), playback silently fails.
 */
export default function useClueAudio(
  gameId: string,
  round: number,
  activeClue: [number, number] | null,
) {
  const { volume, mute, ttsEnabled } = useSoundContext();
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const [i, j] = activeClue ?? [-1, -1];

  // Build the Supabase Storage public URL for this clue's audio.
  const audioUrl =
    activeClue && ttsEnabled
      ? `${SUPABASE_URL}/storage/v1/object/public/${TTS_BUCKET}/${gameId}/${round}-${j}-${i}.mp3`
      : null;

  // Play audio when the clue mounts (or when TTS is toggled on).
  React.useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audio.volume = mute ? 0 : volume;
    audioRef.current = audio;

    // Play and silently catch errors (e.g. file not found, autoplay blocked).
    audio.play().catch(() => {});

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    };
  }, [audioUrl]); // eslint-disable-line react-hooks/exhaustive-deps
  // Intentionally only re-run when audioUrl changes (new clue). Volume/mute
  // changes are handled below without restarting playback.

  // Update volume on an already-playing audio element without restarting.
  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = mute ? 0 : volume;
    }
  }, [volume, mute]);
}
