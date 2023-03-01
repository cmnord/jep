export default function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex justify-center items-center capitalize bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded h-5 whitespace-nowrap font-sans">
      {children}
    </kbd>
  );
}
