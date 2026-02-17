import { z } from "zod";

import type { AuthSession } from "~/models/auth";
import { getSupabase } from "~/supabase";

const soundSchema = z.object({
  /** Float between 0 and 1 (matches HTMLAudioElement.volume). Default: 0.5 */
  volume: z.number().min(0).max(1),
  mute: z.boolean(),
});

const wagerHintsSchema = z.enum(["show", "tap_to_reveal", "never"]);

export type WagerHintsMode = z.infer<typeof wagerHintsSchema>;

export const userSettingsSchema = z.object({
  sound: soundSchema.optional(),
  wagerHints: wagerHintsSchema.optional(),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;

export function parseUserSettings(raw: unknown): UserSettings {
  const result = userSettingsSchema.safeParse(raw);
  return result.success ? result.data : {};
}

export async function updateUserSettings(
  userId: string,
  settings: UserSettings,
  accessToken: AuthSession["accessToken"],
) {
  const { error } = await getSupabase(accessToken)
    .from("accounts")
    .update({ settings })
    .eq("id", userId);

  if (error !== null) {
    throw new Error(error.message);
  }
}
