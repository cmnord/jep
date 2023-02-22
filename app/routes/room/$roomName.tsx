import { json, LoaderArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { createClient } from "@supabase/supabase-js";
import * as React from "react";

import GameComponent from "~/components/game";
import { getGame } from "~/models/game.server";
import { getRoom } from "~/models/room.server";
import { getOrCreateUserSession } from "~/session.server";
import { useDebounce } from "~/utils/use-debounce";
import { useGame } from "~/utils/use-game";
import { GameContext } from "~/utils/use-game-context";

export async function loader({ request, params }: LoaderArgs) {
  const roomNameAndId = params.roomName;
  if (!roomNameAndId) {
    throw new Response("room name not found in URL params", { status: 404 });
  }

  const room = await getRoom(roomNameAndId);
  if (!room) {
    throw new Response("room not found", { status: 404 });
  }

  const game = await getGame(room.game_id);
  if (!game) {
    throw new Response("game not found", { status: 404 });
  }

  const headers = new Headers();
  const userId = await getOrCreateUserSession(request, headers);

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "SUPABASE_URL or SUPABASE_ANON_KEY not found in process.env"
    );
  }
  const env = { SUPABASE_URL, SUPABASE_ANON_KEY };

  return json({ room, game, userId, env }, { headers });
}

interface PresenceKey {
  userId: string;
}

export default function PlayGame() {
  const data = useLoaderData<typeof loader>();

  const gameReducer = useGame(data.game);

  const [players, setPlayers] = React.useState(new Set<string>());
  const debouncedPlayers = useDebounce(players, 1000);

  const client = createClient(
    data.env.SUPABASE_URL,
    data.env.SUPABASE_ANON_KEY,
    {
      realtime: {
        params: {
          eventsPerSecond: 1,
        },
      },
    }
  );

  React.useEffect(() => {
    const channel = client
      .channel(`game:${data.game.id}:room:${data.room.id}`, {
        config: {
          presence: { key: data.userId },
        },
      })
      .on("presence", { event: "sync" }, () => {
        console.log("sync");
        const presenceState = channel.presenceState();
        for (const key in presenceState) {
          const userId = key;
          if (!players.has(userId)) {
            setPlayers((prev) => new Set(prev).add(userId));
          }
        }
      })
      .on<PresenceKey>("presence", { event: "leave" }, (payload) => {
        setPlayers((prev) => {
          const newPlayers = new Set(prev);
          payload.leftPresences.forEach((p) => newPlayers.delete(p.userId));
          return newPlayers;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const msg: PresenceKey = { userId: data.userId };
          await channel.track(msg);
        }
      });
    return () => {
      channel.unsubscribe();
    };
  }, [client, players, setPlayers]);

  return (
    <GameContext.Provider value={gameReducer}>
      <GameComponent
        game={data.game}
        players={debouncedPlayers}
        userId={data.userId}
      />
    </GameContext.Provider>
  );
}
