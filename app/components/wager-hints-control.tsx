import * as Tabs from "@radix-ui/react-tabs";

import { WagerHintsMode } from "~/models/user-settings";
import { useWagerHintsSettings } from "~/utils/user-settings";

const WAGER_HINTS_OPTIONS: { value: WagerHintsMode; label: string }[] = [
  { value: WagerHintsMode.Show, label: "Always" },
  { value: WagerHintsMode.TapToReveal, label: "On tap" },
  { value: WagerHintsMode.Never, label: "Never" },
];

const wagerHintsModes = new Set<string>(Object.values(WagerHintsMode));
function isWagerHintsMode(v: string): v is WagerHintsMode {
  return wagerHintsModes.has(v);
}

const themes = {
  light: {
    label: "text-sm text-slate-600",
    list: "bg-white border border-slate-300 hover:border-blue-500",
    trigger:
      "text-slate-600 hover:bg-blue-600/20 data-[state=active]:bg-blue-600 data-[state=active]:text-white",
  },
  dark: {
    label: "text-sm text-white opacity-70",
    list: "bg-white/10 border border-white/20 hover:border-blue-500/60",
    trigger:
      "text-slate-300 hover:bg-blue-600/20 data-[state=active]:bg-blue-600 data-[state=active]:text-white",
  },
};

export default function WagerHintsControl({
  theme = "light",
}: {
  theme?: "light" | "dark";
} = {}) {
  const { wagerHints, setWagerHints } = useWagerHintsSettings();
  const t = themes[theme];

  return (
    <div className="flex flex-col gap-1">
      <span className={t.label}>Show suggested wagers</span>
      <Tabs.Root
        value={wagerHints}
        onValueChange={(v) => {
          if (isWagerHintsMode(v)) setWagerHints(v);
        }}
      >
        <Tabs.List
          className={`flex w-fit overflow-hidden rounded-lg shadow-sm transition-colors ${t.list}`}
        >
          {WAGER_HINTS_OPTIONS.map((opt) => (
            <Tabs.Trigger
              key={opt.value}
              value={opt.value}
              className={`px-3 py-1.5 text-sm transition-colors ${t.trigger}`}
            >
              {opt.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>
    </div>
  );
}
