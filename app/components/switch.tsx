import * as SwitchPrimitive from "@radix-ui/react-switch";

export default function Switch({
  name,
  checked,
  onClick,
}: {
  name: string;
  checked: boolean;
  onClick: (checked: boolean) => void;
}) {
  return (
    <div
      className="flex items-center"
      style={{ display: "flex", alignItems: "center" }}
    >
      <label className="sr-only" htmlFor={name}>
        {name}
      </label>
      <SwitchPrimitive.Root
        className={
          "w-11 h-6 bg-slate-200 rounded-full relative " +
          "focus:outline-none focus:ring-4 focus:ring-blue-300 " +
          "data-[state=checked]:bg-blue-600 outline-none cursor-default"
        }
        id={name}
        name={name}
        checked={checked}
        onCheckedChange={onClick}
        type="submit"
      >
        <SwitchPrimitive.Thumb
          className={
            "block w-5 h-5 bg-white border border-slate-300 rounded-full " +
            "transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px] " +
            "data-[state=checked]:border-white"
          }
        />
      </SwitchPrimitive.Root>
    </div>
  );
}
