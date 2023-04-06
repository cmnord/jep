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
    <div className="bg-slate-900 text-slate-200 px-3 pt-3 sm:px-6 sm:pt-6 md:px-12 md:pt-12">
      <h2 className="text-2xl font-semibold mb-4">Game over!</h2>
      <div className="flex flex-col gap-4 mb-6">
        <p className="mb-2">The final answer was:</p>
        <blockquote className="relative border-l-4 pl-4 sm:pl-6">
          <p className="text-slate-100 sm:text-xl uppercase font-bold">
            {clue.clue}
          </p>
        </blockquote>
        <p>
          <em>
            What is{" "}
            <span className="uppercase font-bold text-sm bg-cyan-200 text-slate-900 rounded-md p-1.5">
              {clue.answer}
            </span>
            ?
          </em>
        </p>
      </div>
    </div>
  );
}
