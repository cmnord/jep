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
      className="relative flex h-5 w-full touch-none items-center select-none"
      value={[value]}
      onValueChange={([newVal]) => onValueChange(newVal)}
      max={1}
      step={0.01}
      aria-label="Volume"
    >
      <SliderPrimitive.Track className="relative h-1 grow rounded-full bg-slate-300">
        <SliderPrimitive.Range
          className={`absolute h-full rounded-full bg-blue-500 group-hover:bg-blue-400`}
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className={`block h-4 w-4 rounded-full border border-slate-300 bg-white shadow-[0_2px_5px] shadow-slate-400 focus:ring-2 focus:ring-blue-400 focus:outline-none`}
      />
    </SliderPrimitive.Root>
  );
}
