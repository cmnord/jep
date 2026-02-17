import * as TogglePrimitive from "@radix-ui/react-toggle";

import { SpeakerWave, SpeakerXMark } from "~/components/icons";

export function MuteToggle({
  pressed,
  onPressChange,
}: {
  pressed: boolean;
  onPressChange: (pressed: boolean) => void;
}) {
  return (
    <TogglePrimitive.Root
      pressed={pressed}
      onPressedChange={onPressChange}
      aria-label="Mute"
      title="Mute"
      className={`flex items-center justify-center rounded-md p-1 opacity-70 hover:opacity-100 focus:ring-2 focus:ring-blue-500`}
    >
      {pressed ? (
        <SpeakerXMark className="h-5 w-5" />
      ) : (
        <SpeakerWave className="h-5 w-5" />
      )}
    </TogglePrimitive.Root>
  );
}
