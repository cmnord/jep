import { useEngineContext } from "~/engine";

// TODO: game replay
export default function GameOver() {
  const { board } = useEngineContext();
  if (!board) {
    throw new Error("No board found");
  }

  const finalCategory = board.categories[board.categories.length - 1];
  const clue = finalCategory.clues[finalCategory.clues.length - 1];

  return (
    <div className="bg-slate-900 px-3 pt-3 text-slate-200 sm:px-6 sm:pt-6 md:px-12 md:pt-12">
      <h2 className="mb-4 text-2xl font-semibold">Game over!</h2>
      <div className="mb-6 flex flex-col gap-4">
        <p className="mb-2">The final answer was:</p>
        <blockquote className="relative border-l-4 pl-4 sm:pl-6">
          <p className="font-bold uppercase text-slate-100 sm:text-xl">
            {clue.clue}
          </p>
        </blockquote>
        <p>
          <em>
            What is{" "}
            <span className="rounded-md bg-cyan-200 p-1.5 text-sm font-bold uppercase text-slate-900">
              {clue.answer}
            </span>
            ?
          </em>
        </p>
      </div>
    </div>
  );
}
