import { getSupabaseAdmin } from "~/supabase";
import { SUPABASE_URL, TTS_API_KEY } from "~/utils";

const TTS_BUCKET = "tts";
const GOOGLE_TTS_URL =
  "https://texttospeech.googleapis.com/v1/text:synthesize";

/** isTtsEnabled returns true if the TTS API key is configured. */
export function isTtsEnabled(): boolean {
  return Boolean(TTS_API_KEY);
}

/** getTtsStorageUrl constructs the public Supabase Storage URL for a clue's
 * TTS audio file.
 */
export function getTtsStorageUrl(
  gameId: string,
  round: number,
  categoryIndex: number,
  clueIndex: number,
): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${TTS_BUCKET}/${gameId}/${round}-${categoryIndex}-${clueIndex}.mp3`;
}

interface ClueForTts {
  clueText: string;
  round: number;
  categoryIndex: number;
  clueIndex: number;
}

/** generateClueAudio calls Google Cloud TTS to synthesize speech for a single
 * clue and returns the MP3 bytes.
 */
async function generateClueAudio(clueText: string): Promise<Buffer> {
  const response = await fetch(`${GOOGLE_TTS_URL}?key=${TTS_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text: clueText },
      voice: {
        languageCode: "en-US",
        name: "en-US-Chirp3-HD-Leda",
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: 1.0,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google TTS API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { audioContent: string };
  return Buffer.from(data.audioContent, "base64");
}

/** uploadClueAudio uploads an MP3 buffer to Supabase Storage. */
async function uploadClueAudio(
  gameId: string,
  round: number,
  categoryIndex: number,
  clueIndex: number,
  mp3Buffer: Buffer,
): Promise<void> {
  const path = `${gameId}/${round}-${categoryIndex}-${clueIndex}.mp3`;
  const { error } = await getSupabaseAdmin()
    .storage.from(TTS_BUCKET)
    .upload(path, mp3Buffer, {
      contentType: "audio/mpeg",
      upsert: true,
    });

  if (error) {
    throw new Error(`Supabase Storage upload error for ${path}: ${error.message}`);
  }
}

/** generateTtsForGame generates TTS audio for all clues in a game and uploads
 * them to Supabase Storage. Runs all clues in parallel for speed.
 *
 * This is best-effort: individual clue failures are logged but don't fail the
 * entire operation.
 */
export async function generateTtsForGame(
  gameId: string,
  clues: ClueForTts[],
): Promise<{ succeeded: number; failed: number }> {
  if (!isTtsEnabled()) {
    return { succeeded: 0, failed: 0 };
  }

  const results = await Promise.allSettled(
    clues.map(async (clue) => {
      const mp3 = await generateClueAudio(clue.clueText);
      await uploadClueAudio(
        gameId,
        clue.round,
        clue.categoryIndex,
        clue.clueIndex,
        mp3,
      );
    }),
  );

  let succeeded = 0;
  let failed = 0;
  for (const result of results) {
    if (result.status === "fulfilled") {
      succeeded++;
    } else {
      failed++;
      console.error("TTS generation failed for clue:", result.reason);
    }
  }

  console.info(
    `TTS generation for game ${gameId}: ${succeeded} succeeded, ${failed} failed`,
  );

  return { succeeded, failed };
}
