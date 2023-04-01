import type { RealtimePostgresInsertPayload } from "@supabase/realtime-js";
import { createClient } from "@supabase/supabase-js";
import * as React from "react";

export function useChannel<T extends { [key: string]: any }>({
  channelName,
  table,
  filter,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  callback,
}: {
  channelName: string;
  /** The database table to listen to. */
  table: string;
  /** Receive database changes when filter is matched. */
  filter: string;
  /** Make sure that callback is wrapped in useCallback to prevent unnecessary
   * cleanup and re-subscription.
   */
  callback: (payload: RealtimePostgresInsertPayload<T>) => void;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}) {
  const client = React.useMemo(
    () =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        realtime: {
          params: {
            eventsPerSecond: 1,
          },
        },
      }),
    [SUPABASE_ANON_KEY, SUPABASE_URL]
  );

  React.useEffect(() => {
    const channel = client.channel(`realtime:${channelName}`);
    if (channel.state !== "closed") {
      return;
    }
    try {
      channel
        .on<T>(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table,
            filter,
          },
          (payload: RealtimePostgresInsertPayload<T>) => {
            callback(payload);
          }
        )
        .subscribe((status, err) => {
          console.info(status);
          if (err) {
            throw err;
          }
        });

      // cleanup function to unsubscribe from the channel
      return () => {
        if (channel.state === "joined") {
          console.info("unsubscribing from channel", channel.state);
          channel.unsubscribe();
          client.removeChannel(channel);
        }
      };
    } catch (error) {
      console.error(error);
    }
  }, [channelName, filter, table, callback, client]);
}

export default useChannel;
