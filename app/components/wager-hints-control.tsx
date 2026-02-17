import * as Tabs from "@radix-ui/react-tabs";

import { WagerHintsMode } from "~/models/user-settings";
import { useWagerHintsSettings } from "~/utils/user-settings";

const WAGER_HINTS_OPTIONS: { value: WagerHintsMode; label: string }[] = [
  { value: WagerHintsMode.Show, label: "Always" },
  { value: WagerHintsMode.TapToReveal, label: "On tap" },
  { value: WagerHintsMode.Never, label: "Never" },
];

export default function WagerHintsControl() {
  const { wagerHints, setWagerHints } = useWagerHintsSettings();

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm opacity-70">Show suggested wagers</span>
      <Tabs.Root
        value={wagerHints}
        onValueChange={(value) => setWagerHints(value as WagerHintsMode)}
      >
        <Tabs.List className="flex overflow-hidden rounded-md border border-current/30">
          {WAGER_HINTS_OPTIONS.map((opt) => (
            <Tabs.Trigger
              key={opt.value}
              value={opt.value}
              className="px-3 py-1.5 text-sm opacity-70 transition-colors hover:bg-blue-600/20 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:opacity-100"
            >
              {opt.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>
    </div>
  );
}
