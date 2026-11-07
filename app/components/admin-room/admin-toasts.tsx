import * as ToastPrimitive from "@radix-ui/react-toast";
import * as React from "react";

import { useEngineContext } from "~/engine";
import { useTranslation } from "~/i18n";
import { formatDollarsWithSign } from "~/utils";

interface AdminToast {
  id: number;
  text: string;
  /** 🛡 for the site admin, 🎤 for the room's host (feature 22). */
  icon: string;
}

/** useAdminToasts turns the site admin's interventions that arrive while the
 * page is open into short messages for everyone in the room: a score change
 * ("Admin: Ann +$200") and a skipped question. What already happened when
 * the page loaded is not announced, and nothing renders on the server, so it
 * is hydration-safe. */
export function useAdminToasts() {
  const { t } = useTranslation();
  const {
    numSkipped,
    numSkippedByHost,
    players,
    leftPlayers,
    scoreAdjustments,
  } = useEngineContext();
  const [toasts, setToasts] = React.useState<AdminToast[]>([]);
  const seen = React.useRef<{
    adjustments: number;
    skipped: number;
    skippedByHost: number;
  } | null>(null);
  const nextId = React.useRef(1);

  React.useEffect(() => {
    const previous = seen.current;
    seen.current = {
      adjustments: scoreAdjustments.length,
      skipped: numSkipped,
      skippedByHost: numSkippedByHost,
    };
    // The first run records what the page loaded with.
    if (!previous) return;
    const added: AdminToast[] = [];
    for (const { userId, delta, byHost } of scoreAdjustments.slice(
      previous.adjustments,
    )) {
      const name =
        players.get(userId)?.name ?? leftPlayers.get(userId)?.name ?? "";
      const values = { name, amount: formatDollarsWithSign(delta) };
      added.push({
        id: nextId.current++,
        icon: byHost ? "🎤" : "🛡",
        text: byHost
          ? t("host.toast.score", values)
          : t("room.admin.toastAdjusted", values),
      });
    }
    if (numSkipped > previous.skipped) {
      const byHost = numSkippedByHost > previous.skippedByHost;
      added.push({
        id: nextId.current++,
        icon: byHost ? "🎤" : "🛡",
        text: byHost ? t("host.toast.skipped") : t("room.admin.toastSkipped"),
      });
    }
    if (added.length) {
      setToasts((current) => [...current, ...added].slice(-4));
    }
  }, [scoreAdjustments, numSkipped, numSkippedByHost, players, leftPlayers, t]);

  const dismiss = React.useCallback(
    (id: number) => setToasts((current) => current.filter((x) => x.id !== id)),
    [],
  );
  return { toasts, dismiss };
}

/** AdminToasts shows the admin's interventions to everyone in the room. */
export function AdminToasts() {
  const { toasts, dismiss } = useAdminToasts();
  return (
    <>
      {toasts.map((toast) => (
        <ToastPrimitive.Root
          key={toast.id}
          duration={6000}
          onOpenChange={(open) => {
            if (!open) dismiss(toast.id);
          }}
          className="flex items-center gap-2 rounded-md bg-ink-100 p-4 shadow-md data-[state=closed]:animate-hide data-[state=open]:animate-slide-in data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-[transform_200ms_ease-out] data-[swipe=end]:animate-swipe-out data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]"
          data-testid="admin-toast"
        >
          <span aria-hidden>{toast.icon}</span>
          <ToastPrimitive.Description asChild>
            <p className="text-sm font-semibold text-ink-900">{toast.text}</p>
          </ToastPrimitive.Description>
        </ToastPrimitive.Root>
      ))}
    </>
  );
}
