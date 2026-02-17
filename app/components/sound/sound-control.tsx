import * as React from "react";

import { useSoundSettings } from "~/utils/user-settings";

import { MuteToggle } from "./mute-toggle";
import { VolumeSlider } from "./volume-slider";

export function SoundControl({ showSlider = true }: { showSlider?: boolean }) {
  const sound = useSoundSettings();

  // Local state for responsive slider — writes through to context
  const [volume, setLocalVolume] = React.useState(sound.volume);
  const [mute, setLocalMute] = React.useState(sound.mute);
  const prevVolume = React.useRef(volume);

  function setVolume(v: number) {
    setLocalVolume(v);
    sound.setVolume(v);
  }

  function setMute(m: boolean) {
    setLocalMute(m);
    sound.setMute(m);
  }

  return (
    <form className="group flex grow items-center gap-2">
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
    </form>
  );
}
