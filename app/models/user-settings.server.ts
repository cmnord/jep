import type { AuthSession } from "~/models/auth";
import { getSupabase } from "~/supabase";

export {
  type UserSettings,
  WagerHintsMode,
  parseUserSettings,
  userSettingsSchema,
} from "~/models/user-settings";

export async function updateUserSettings(
  userId: string,
  settings: import("~/models/user-settings").UserSettings,
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
