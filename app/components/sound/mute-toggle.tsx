import * as TogglePrimitive from "@radix-ui/react-toggle";

// Heroicon name: solid/speaker-x-mark
function SpeakerXMark() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5"
      role="img"
      aria-labelledby="unmute-title"
    >
      <title id="mute-title">Unmute</title>
      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 001.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 00-1.06-1.06l-1.72 1.72-1.72-1.72z" />
    </svg>
  );
}

// Heroicon name: solid/speaker-wave
function SpeakerWave() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5"
      role="img"
      aria-labelledby="mute-title"
    >
      <title id="mute-title">Mute</title>
      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
      <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
    </svg>
  );
}

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
      className={`flex items-center justify-center rounded-md p-1 text-slate-500
      focus:ring-2 focus:ring-blue-500
      group-hover:text-slate-700`}
    >
      {pressed ? <SpeakerXMark /> : <SpeakerWave />}
    </TogglePrimitive.Root>
  );
}
