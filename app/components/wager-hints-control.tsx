import * as Tabs from "@radix-ui/react-tabs";

import {
  type WagerHintsMode,
  useWagerHintsContext,
} from "~/utils/use-wager-hints";

const WAGER_HINTS_OPTIONS: { value: WagerHintsMode; label: string }[] = [
  { value: "show", label: "Always" },
  { value: "tap_to_reveal", label: "On tap" },
  { value: "never", label: "Never" },
];

export default function WagerHintsControl() {
  const { wagerHints, setWagerHints } = useWagerHintsContext();

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-slate-300">Show suggested wagers</span>
      <Tabs.Root
        value={wagerHints}
        onValueChange={(value) => setWagerHints(value as WagerHintsMode)}
      >
        <Tabs.List className="flex overflow-hidden rounded-md border border-slate-400">
          {WAGER_HINTS_OPTIONS.map((opt) => (
            <Tabs.Trigger
              key={opt.value}
              value={opt.value}
              className="px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              {opt.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>
    </div>
  );
}
