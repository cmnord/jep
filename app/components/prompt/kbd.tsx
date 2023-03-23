export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex justify-center items-center capitalize bg-slate-200 text-slate-800 text-xs px-2 py-1 rounded h-5 whitespace-nowrap font-sans">
      {children}
    </kbd>
  );
}
