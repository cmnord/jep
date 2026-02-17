import { z } from "zod";

const soundSchema = z.object({
  /** Float between 0 and 1 (matches HTMLAudioElement.volume). Default: 0.5 */
  volume: z.number().min(0).max(1),
  mute: z.boolean(),
});

export enum WagerHintsMode {
  Show = "show",
  TapToReveal = "tap_to_reveal",
  Never = "never",
}

const wagerHintsSchema = z.nativeEnum(WagerHintsMode);

export const userSettingsSchema = z.object({
  sound: soundSchema.optional(),
  wagerHints: wagerHintsSchema.optional(),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;

export function parseUserSettings(raw: unknown): UserSettings {
  const result = userSettingsSchema.safeParse(raw);
  return result.success ? result.data : {};
}
