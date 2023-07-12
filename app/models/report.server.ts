import { db } from "~/db.server";
import type { Database } from "~/models/database.types";

type ReportTable = Database["public"]["Tables"]["reports"];

/* Writes */

export async function insertReport(
  gameId: string,
  reason: string,
  userId?: string,
) {
  const { data, error } = await db
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
