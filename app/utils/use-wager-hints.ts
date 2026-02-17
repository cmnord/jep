import * as React from "react";

export type WagerHintsMode = "show" | "tap_to_reveal" | "never";

interface WagerHintsSettings {
  wagerHints: WagerHintsMode;
  setWagerHints: (mode: WagerHintsMode) => void;
}

/** WagerHintsContext stores the user's preference for seeing wager strategy
 * recommendations during Final clue wagering.
 */
export const WagerHintsContext = React.createContext<WagerHintsSettings>({
  wagerHints: "show",
  setWagerHints: () => null,
});

export function useWagerHintsContext() {
  return React.useContext(WagerHintsContext);
}
