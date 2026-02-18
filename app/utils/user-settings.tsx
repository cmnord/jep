import * as ToastPrimitive from "@radix-ui/react-toast";
import { produce } from "immer";
import * as React from "react";
import { useFetcher } from "react-router";

import { type UserSettings, WagerHintsMode } from "~/models/user-settings";

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

  // Toast state for "Preferences saved." notification
  const [toastOpen, setToastOpen] = React.useState(false);
  const toastTimerRef = React.useRef(0);
  const prevFetcherState = React.useRef(fetcher.state);
  React.useEffect(() => {
    const prev = prevFetcherState.current;
    prevFetcherState.current = fetcher.state;
    if (
      prev !== "idle" &&
      fetcher.state === "idle" &&
      (fetcher.data as { ok?: boolean })?.ok
    ) {
      setToastOpen(false);
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => {
        setToastOpen(true);
      }, 100);
    }
  }, [fetcher.state, fetcher.data]);
  React.useEffect(() => {
    return () => window.clearTimeout(toastTimerRef.current);
  }, []);

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

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
      <ToastPrimitive.Root
        className="items-center rounded-md bg-slate-100 p-4 shadow-md data-[state=closed]:animate-hide data-[state=open]:animate-slide-in data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-[transform_200ms_ease-out] data-[swipe=end]:animate-swipe-out data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]"
        open={toastOpen}
        onOpenChange={setToastOpen}
      >
        <ToastPrimitive.Description asChild>
          <p className="text-sm text-slate-700">Preferences saved.</p>
        </ToastPrimitive.Description>
      </ToastPrimitive.Root>
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  return React.useContext(UserSettingsContext);
}

const DEFAULT_WAGER_HINTS = WagerHintsMode.Show;

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
