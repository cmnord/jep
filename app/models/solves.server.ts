import { AuthSession } from "~/models/auth";
import { getSupabase } from "~/supabase";

export type Solve = Awaited<ReturnType<typeof getSolvesForUser>>[number];

/* Reads */

export async function getSolve(
  userId: string,
  gameId: string,
  accessToken?: AuthSession["accessToken"],
) {
  const { data, error } = await getSupabase(accessToken)
    .from("solves")
    .select("*")
    .eq("user_id", userId)
    .eq("game_id", gameId);

  if (error !== null) {
    throw new Error(error.message);
  }

  const solve = data.at(0);
  if (!solve) {
    return null;
  }
  return solve;
}

export async function getSolvesForUser(
  userId: string,
  accessToken?: AuthSession["accessToken"],
) {
  const { data, error } = await getSupabase(accessToken)
    .from("solves")
    .select("*, rooms ( id, name ), games ( id, title )")
    .eq("user_id", userId)
    .order("started_at", { ascending: false });

  if (error !== null) {
    throw new Error(error.message);
  }

  return data;
}

/* Writes */

/** markAttempted marks the game as started. */
export async function markAttempted(
  userId: string,
  gameId: string,
  roomId: number,
  accessToken?: AuthSession["accessToken"],
) {
  const now = new Date();

  const { data, error } = await getSupabase(accessToken)
    .from("solves")
    .insert({
      game_id: gameId,
      room_id: roomId,
      user_id: userId,
      started_at: now.toISOString(),
    })
    .select();

  if (error !== null) {
    throw new Error(error.message);
  }

  const solve = data.at(0);
  if (!solve) {
    throw new Error("Could not mark as attempted");
  }
}

/** markSolved marks the game as solved. */
export async function markSolved(
  userId: string,
  gameId: string,
  roomId: number,
  accessToken?: AuthSession["accessToken"],
) {
  const now = new Date();

  const { data, error } = await getSupabase(accessToken)
    .from("solves")
    .update({ solved_at: now.toISOString(), room_id: roomId })
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .select();

  if (error !== null) {
    throw new Error(error.message);
  }

  const solve = data.at(0);
  if (!solve) {
    throw new Error("Could not find game to mark as solved");
  }
}
