import { CheckCircle, MinusCircle } from "~/components/icons";

export default function SolveIcon({ solved }: { solved: boolean }) {
  return solved ? (
    <CheckCircle className="inline h-5 w-5 text-slate-400" title="Solved" />
  ) : (
    <MinusCircle
      className="inline h-5 w-5 text-yellow-600"
      title="In progress"
    />
  );
}
