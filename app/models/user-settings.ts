import { z } from "zod";

import {
  coercePlayerColor,
  PLAYER_COLOR_HEX_REGEX,
} from "~/models/player-color";

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

const wagerHintsSchema = z.enum(WagerHintsMode);

function normalizePlayerName(raw: unknown) {
  if (typeof raw !== "string") {
    return raw;
  }
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

const gameDefaultsSchema = z.object({
  playerName: z
    .preprocess(normalizePlayerName, z.string().min(1).max(50))
    .optional(),
  playerColor: z
    .preprocess(
      (value) => coercePlayerColor(value),
      z.string().regex(PLAYER_COLOR_HEX_REGEX),
    )
    .optional(),
});

export const userSettingsSchema = z.object({
  sound: soundSchema.optional(),
  wagerHints: wagerHintsSchema.optional(),
  gameDefaults: gameDefaultsSchema.optional(),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;

export function parseUserSettings(raw: unknown): UserSettings {
  const result = userSettingsSchema.safeParse(raw);
  return result.success ? result.data : {};
}
