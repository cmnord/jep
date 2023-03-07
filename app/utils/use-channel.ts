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
  callback: (payload: RealtimePostgresInsertPayload<T>) => void;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: {
      params: {
        eventsPerSecond: 1,
      },
    },
  });

  React.useEffect(() => {
    try {
      // create the channel in the database
      const channel = client
        .channel(`realtime:${channelName}`)
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
          console.log(status);
          if (err) {
            throw err;
          }
        });

      // cleanup function to unsubscribe from the channel
      return () => {
        if (channel.state === "joined") {
          console.log("unsubscribing from channel", channel.state);
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
