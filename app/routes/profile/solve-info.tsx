import { ArrowTopRightOnSquare } from "~/components/icons";
import Link from "~/components/link";
import SolveIcon from "~/components/solve-icon";
import { Solve } from "~/models/solves.server";

const formatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default function SolveInfo({ solve }: { solve: Solve }) {
  const roomName = solve.rooms?.name;
  const gameId = solve.games?.id;
  const title = solve.games?.title;
  const solved = solve.solved_at !== null;

  const roomLink = solved
    ? `/room/${solve.room_id}-${roomName}/summary`
    : `/room/${solve.room_id}-${roomName}`;

  const solveDate = solve.solved_at
    ? formatter.format(new Date(solve.solved_at))
    : solve.started_at
      ? formatter.format(new Date(solve.started_at))
      : undefined;

  return (
    <div className="flex items-center gap-2">
      <SolveIcon solved={solved} />
      <Link to={roomLink}>{title}</Link>{" "}
      <span className="text-sm text-slate-500">{solveDate}</span>
      {gameId ? (
        <span className="text-sm">
          &middot;{" "}
          <Link
            to={`/game/${gameId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="inline-flex items-center gap-1">
              Game details
              <ArrowTopRightOnSquare className="h-3.5 w-3.5" />
            </span>
          </Link>
        </span>
      ) : null}
    </div>
  );
}
