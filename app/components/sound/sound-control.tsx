import * as React from "react";

import { useSoundContext } from "~/utils/use-sound";
import { MuteToggle } from "./mute-toggle";
import { VolumeSlider } from "./volume-slider";

export function SoundControl({
  showSlider = true,
  theme = "dark",
}: {
  showSlider?: boolean;
  theme?: "dark" | "light";
}) {
  const { mute, setMute, volume, setVolume } = useSoundContext();
  const prevVolume = React.useRef(volume);

  return (
    <form className="flex items-center gap-2 group">
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
        theme={theme}
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
    </form>
  );
}
