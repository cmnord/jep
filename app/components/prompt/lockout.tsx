/** Lockout is a visual indicator that a contestant buzzed too early. */
export function Lockout({ active }: { active: boolean }) {
  if (!active) {
    return null;
  }

  return (
    <div className="absolute top-0 left-0 h-full w-full bg-black/50">
      <div
        className={`flex h-full w-full flex-col items-center justify-center text-6xl font-bold text-white md:text-7xl lg:text-9xl`}
      >
        LOCKOUT
      </div>
    </div>
  );
}
