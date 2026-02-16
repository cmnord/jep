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
        className={`relative h-6 w-11 cursor-default rounded-full bg-slate-200 outline-none focus:ring-4 focus:ring-blue-300 focus:outline-none data-[state=checked]:bg-blue-600`}
        id={name}
        name={name}
        checked={checked}
        onCheckedChange={onClick}
        type="submit"
      >
        <SwitchPrimitive.Thumb
          className={`block h-5 w-5 translate-x-0.5 rounded-full border border-slate-300 bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px] data-[state=checked]:border-white`}
        />
      </SwitchPrimitive.Root>
    </div>
  );
}
