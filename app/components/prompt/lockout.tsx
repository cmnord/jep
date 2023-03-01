/** Lockout is a visual indicator that a contestant buzzed too early. */
export default function Lockout({ active }: { active: boolean }) {
  if (!active) {
    return null;
  }

  return (
    <div className="absolute left-0 top-0 w-full h-full bg-black bg-opacity-50">
      <div
        className={
          "flex flex-col items-center justify-start pt-10 w-full h-full text-white font-bold " +
          "text-6xl md:text-7xl lg:text-9xl"
        }
      >
        LOCKOUT
      </div>
    </div>
  );
}
