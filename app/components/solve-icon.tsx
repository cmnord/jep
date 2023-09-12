/** Heroicon name: solid/check-circle */
function CheckCircle() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="inline h-5 w-5 text-slate-400"
      role="img"
      aria-labelledby="check-circle-title"
    >
      <title id="check-circle-title">Solved</title>
      <path
        fillRule="evenodd"
        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Heroicon name: outline/minus-circle */
function MinusCircle() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="inline h-5 w-5 text-yellow-600"
      role="img"
      aria-labelledby="minus-circle-title"
    >
      <title id="minus-circle-title">Unsolved</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

export default function SolveIcon({ solved }: { solved: boolean }) {
  return solved ? <CheckCircle /> : <MinusCircle />;
}
