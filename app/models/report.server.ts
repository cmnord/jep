import { AuthSession } from "~/models/auth";
import type { Database } from "~/models/database.types";
import { getSupabase } from "~/supabase";

type ReportTable = Database["public"]["Tables"]["reports"];

/* Writes */

export async function insertReport(
  gameId: string,
  reason: string,
  userId?: string,
  accessToken?: AuthSession["accessToken"],
) {
  const client = getSupabase(accessToken);
  const { data, error } = await client
    .from<"reports", ReportTable>("reports")
    .insert<ReportTable["Insert"]>({
      created_by: userId,
      game_id: gameId,
      reason,
    })
    .select();

  if (error !== null) {
    throw new Error(error.message);
  }

  const report = data.at(0);
  if (!report) {
    throw new Error("report not created");
  }
  return report.id;
}
