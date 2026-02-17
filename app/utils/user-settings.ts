import { produce } from "immer";
import * as React from "react";
import { useFetcher } from "react-router";

import type {
  UserSettings,
  WagerHintsMode,
} from "~/models/user-settings.server";

const DEFAULT_SETTINGS: UserSettings = {};
const DEFAULT_VOLUME = 0.5;
const DEFAULT_MUTE = false;
const SAVE_DEBOUNCE_MS = 500;

interface UserSettingsContextValue {
  settings: UserSettings;
  saveSettings: (recipe: (draft: UserSettings) => void) => void;
}

const UserSettingsContext = React.createContext<UserSettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  saveSettings: () => null,
});

export function UserSettingsProvider({
  initialSettings,
  loggedIn,
  children,
}: {
  initialSettings?: UserSettings;
  loggedIn: boolean;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = React.useState<UserSettings>(
    initialSettings ?? DEFAULT_SETTINGS,
  );
  const fetcher = useFetcher();
  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;

  const saveSettings = React.useCallback(
    (recipe: (draft: UserSettings) => void) => setSettings(produce(recipe)),
    [],
  );

  // Debounced network save, triggered by settings changes
  const isInitial = React.useRef(true);
  React.useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    if (!loggedIn) return;

    const timer = setTimeout(() => {
      fetcherRef.current.submit(JSON.stringify(settings), {
        method: "POST",
        action: "/settings",
        encType: "application/json",
      });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [settings, loggedIn]);

  const value = React.useMemo(
    () => ({ settings, saveSettings }),
    [settings, saveSettings],
  );

  return React.createElement(UserSettingsContext.Provider, { value }, children);
}

export function useUserSettings() {
  return React.useContext(UserSettingsContext);
}

const DEFAULT_WAGER_HINTS: WagerHintsMode = "show";

export function useWagerHintsSettings() {
  const { settings, saveSettings } = useUserSettings();
  const wagerHints = settings.wagerHints ?? DEFAULT_WAGER_HINTS;

  const setWagerHints = React.useCallback(
    (mode: WagerHintsMode) =>
      saveSettings((draft) => {
        draft.wagerHints = mode;
      }),
    [saveSettings],
  );

  return { wagerHints, setWagerHints };
}

/** useSoundSettings provides the same API shape as the old SoundContext. */
export function useSoundSettings() {
  const { settings, saveSettings } = useUserSettings();
  const sound = settings.sound;
  const volume = sound?.volume ?? DEFAULT_VOLUME;
  const mute = sound?.mute ?? DEFAULT_MUTE;

  const setVolume = React.useCallback(
    (v: number) =>
      saveSettings((draft) => {
        if (!draft.sound)
          draft.sound = { volume: DEFAULT_VOLUME, mute: DEFAULT_MUTE };
        draft.sound.volume = v;
      }),
    [saveSettings],
  );

  const setMute = React.useCallback(
    (m: boolean) =>
      saveSettings((draft) => {
        if (!draft.sound)
          draft.sound = { volume: DEFAULT_VOLUME, mute: DEFAULT_MUTE };
        draft.sound.mute = m;
      }),
    [saveSettings],
  );

  return { volume, mute, setVolume, setMute };
}
