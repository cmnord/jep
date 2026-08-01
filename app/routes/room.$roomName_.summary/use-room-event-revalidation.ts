import * as React from "react";
import { useRevalidator } from "react-router";

import type { DbRoomEvent } from "~/models/room-event.server";
import { getSupabase } from "~/supabase";

/** Keep a loaded summary in sync with corrections that arrive during the
 * post-game grace period. Revalidating when the subscription connects closes
 * the race between the loader's initial snapshot and the realtime channel
 * becoming active; later inserts revalidate immediately.
 */
export function useRoomEventRevalidation(roomId: number) {
  const { revalidate } = useRevalidator();
  const revalidateRef = React.useRef(revalidate);

  React.useEffect(() => {
    revalidateRef.current = revalidate;
  }, [revalidate]);

  React.useEffect(() => {
    const client = getSupabase();
    const channel = client
      .channel(`summary:roomId:${roomId}`)
      .on<DbRoomEvent>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_events",
          filter: `room_id=eq.${roomId}`,
        },
        () => revalidateRef.current(),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          revalidateRef.current();
        }
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [roomId]);
}
