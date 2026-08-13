type InputProps = React.ComponentPropsWithRef<"input">;
type InputVariant = "default" | "search" | "game" | "player";

type Props = {
  variant?: InputVariant;
} & Omit<InputProps, "className">;

const VARIANT_STYLES: Record<InputVariant, string> = {
  default:
    "block w-full rounded-lg border border-slate-300 bg-slate-50 p-2 text-sm text-slate-900 placeholder:text-sm focus:border-blue-500 focus:ring-blue-500",
  search:
    "block w-full rounded-lg border border-slate-300 bg-slate-50 p-4 pl-10 text-sm text-slate-900 placeholder:text-sm focus:border-blue-500 focus:ring-blue-500",
  game: "block w-full min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 p-2 font-handwriting text-xl font-bold text-slate-900 placeholder:font-sans placeholder:text-sm placeholder:font-normal focus:border-blue-500 focus:ring-blue-500",
  player:
    "block w-full min-w-0 border-0 bg-transparent p-0 font-handwriting text-2xl font-bold text-white placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:text-white/40 focus:ring-0 focus:outline-none",
};

export default function Input({ variant = "default", ...props }: Props) {
  return <input {...props} className={VARIANT_STYLES[variant]} />;
}
