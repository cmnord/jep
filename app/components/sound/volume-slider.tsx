import * as SliderPrimitive from "@radix-ui/react-slider";

export function VolumeSlider({
  value,
  onValueChange,
}: {
  value: number;
  onValueChange: (value: number) => void;
}) {
  return (
    <SliderPrimitive.Root
      className="relative flex items-center select-none touch-none w-full h-5"
      value={[value]}
      onValueChange={([newVal]) => onValueChange(newVal)}
      max={1}
      step={0.01}
      aria-label="Volume"
    >
      <SliderPrimitive.Track className="relative grow bg-slate-500 rounded-full h-1">
        <SliderPrimitive.Range
          className={
            "absolute rounded-full h-full bg-slate-200 " +
            "group-hover:bg-blue-400"
          }
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className={
          "block w-4 h-4 bg-white rounded-full shadow-[0_2px_5px] shadow-slate-700 " +
          "focus:outline-none focus:ring-2 focus:ring-blue-400"
        }
      />
    </SliderPrimitive.Root>
  );
}
