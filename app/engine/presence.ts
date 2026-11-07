/** PresenceRole is what a client announces on the room's Realtime channel
 * (presence). Players and the TV share only their role; a spectator also
 * shares their user id and display name (PresenceIdentity), so the site
 * admin can give them the host seat (feature 22). */
export type PresenceRole = "player" | "host" | "spectator" | "presenter";

/** PresenceIdentity is announced by spectators only. */
export interface PresenceIdentity {
  userId: string;
  name: string;
}

type PresenceState = Record<string, readonly Record<string, unknown>[]>;

/** countWatchers counts the spectators in a Realtime presence state
 * (`channel.presenceState()`: presence key -> metas). A key with several
 * metas (e.g. re-tracked) counts once, by its latest role. Presenter screens
 * (TVs) and players are not counted. */
export function countWatchers(presenceState: PresenceState): number {
  let count = 0;
  for (const metas of Object.values(presenceState)) {
    if (metas.at(-1)?.role === "spectator") count++;
  }
  return count;
}

/** listWatchers lists the spectators who announced who they are (one entry
 * per user id, e.g. a phone and a laptop of the same person), sorted by
 * name. */
export function listWatchers(presenceState: PresenceState): PresenceIdentity[] {
  const byId = new Map<string, PresenceIdentity>();
  for (const metas of Object.values(presenceState)) {
    const meta = metas.at(-1);
    if (
      meta?.role === "spectator" &&
      typeof meta.userId === "string" &&
      meta.userId &&
      typeof meta.name === "string"
    ) {
      byId.set(meta.userId, { userId: meta.userId, name: meta.name });
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}
