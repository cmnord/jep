export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 items-center justify-center rounded bg-slate-200 px-2 py-1 font-sans text-xs whitespace-nowrap text-slate-800 capitalize">
      {children}
    </kbd>
  );
}
