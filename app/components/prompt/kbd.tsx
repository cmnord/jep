export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 items-center justify-center whitespace-nowrap rounded bg-slate-200 px-2 py-1 font-sans text-xs capitalize text-slate-800">
      {children}
    </kbd>
  );
}
