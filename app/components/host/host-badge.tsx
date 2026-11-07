import clsx from "clsx";
import { useFetcher } from "react-router";

import { PlayerIcon } from "~/components/player/player-icon";
import { GameState, useEngineContext } from "~/engine";
import { useTranslation } from "~/i18n";

/** HostBadge shows who holds the host seat (feature 22): "🎤 Host: Vic" for
 * everyone, "🎤 You're the host" with a "Stop hosting" button for the host
 * (between questions). Nothing without a host. */
export function HostBadge({
  roomId,
  userId,
  variant = "room",
}: {
  roomId?: number;
  userId?: string;
  /** "tv": bigger, no buttons. */
  variant?: "room" | "tv";
}) {
  const { host, activeClue, type } = useEngineContext();
  const { t } = useTranslation();
  const fetcher = useFetcher();
  if (!host) return null;
  const isHost = userId !== undefined && host.userId === userId;
  const canStop =
    isHost &&
    roomId !== undefined &&
    activeClue === null &&
    type !== GameState.GameOver;
  const tv = variant === "tv";
  return (
    <div
      className={clsx(
        "flex min-w-0 items-center gap-2 rounded-full bg-white/10 py-1 pr-3 pl-1 text-white ring-1 ring-white/20",
        tv ? "text-xl lg:text-3xl" : "text-sm",
      )}
      data-testid="host-badge"
    >
      <PlayerIcon player={host} size={tv ? "md" : "sm"} />
      <span className="truncate font-semibold">
        <span aria-hidden>🎤 </span>
        {isHost ? t("host.badgeYou") : t("host.badge", { name: host.name })}
      </span>
      {canStop ? (
        <fetcher.Form method="POST" action={`/room/${roomId}/host`}>
          <input type="hidden" name="intent" value="release" />
          <input type="hidden" name="userId" value={userId} />
          <button
            type="submit"
            className="ml-1 rounded-full px-2 py-0.5 text-xs whitespace-nowrap text-slate-300 underline-offset-2 hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            title={t("host.stopHelp")}
            disabled={fetcher.state !== "idle"}
          >
            {t("host.stop")}
          </button>
        </fetcher.Form>
      ) : null}
    </div>
  );
}
