import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { useSoundContext } from "~/utils/use-sound";

import { MuteToggle } from "./mute-toggle";
import { VolumeSlider } from "./volume-slider";

export function SoundControl({ showSlider = true }: { showSlider?: boolean }) {
  const { mute, setMute, volume, setVolume, ttsEnabled, setTtsEnabled } =
    useSoundContext();
  const prevVolume = React.useRef(volume);

  return (
    <form className="group flex items-center gap-2">
      <MuteToggle
        pressed={mute}
        onPressChange={(pressed) => {
          setMute(pressed);
          if (pressed) {
            prevVolume.current = volume;
            setVolume(0);
          } else {
            setVolume(prevVolume.current);
          }
        }}
      />
      {showSlider && (
        <VolumeSlider
          value={volume}
          onValueChange={(value) => {
            setVolume(value);
            if (value === 0) {
              setMute(true);
            } else {
              setMute(false);
            }
          }}
        />
      )}
      <TtsToggle enabled={ttsEnabled} onToggle={setTtsEnabled} />
    </form>
  );
}

function TtsToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500 group-hover:text-slate-700">
      <SwitchPrimitive.Root
        checked={enabled}
        onCheckedChange={onToggle}
        className="relative h-4 w-7 rounded-full bg-slate-300 data-[state=checked]:bg-blue-500"
      >
        <SwitchPrimitive.Thumb className="block h-3 w-3 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-3.5" />
      </SwitchPrimitive.Root>
      <span>Read clues</span>
    </label>
  );
}
