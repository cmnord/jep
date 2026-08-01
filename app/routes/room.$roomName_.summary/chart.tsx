import {
  Dot,
  Label,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Action, gameEngine } from "~/engine";
import { isCorrectCheckAction } from "~/engine/actions";
import {
  Player,
  getNumCluesInBoard,
  getPlayer,
  stateFromGame,
} from "~/engine/state";
import { Game } from "~/models/game.server";
import { getPlayerColor } from "~/utils";

export interface DataPoint {
  x: number;
  wagerable: number;
  // Per-player score for each clue.
  [key: string]: number;
}

const AXIS_COLOR = "#666";

const compactFormatter = Intl.NumberFormat("en-US", {
  notation: "compact",
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0, // Round to whole dollars.
});

function AngledAxisTick({
  x,
  y,
  payload,
}: {
  x: string | number;
  y: string | number;
  payload: { value: number };
}) {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        textAnchor="end"
        fill={AXIS_COLOR}
        transform="rotate(-35)"
      >
        {compactFormatter.format(payload.value)}
      </text>
    </g>
  );
}

/** CustomDot shows a larger dot for wagerable clues. */
const CustomDot = (props: {
  cx?: number;
  cy?: number;
  fill?: string;
  stroke?: string;
  payload?: DataPoint;
}) => {
  const { cx, cy, fill, payload, stroke } = props;
  if (payload?.wagerable && cx && cy) {
    return (
      <circle
        cx={cx}
        cy={cy}
        fill={fill}
        r={6}
        stroke={stroke}
        strokeWidth={2}
      />
    );
  }

  return <Dot cx={cx} cy={cy} fill={fill} stroke={stroke} r={4} />;
};

/** buildChartData replays the room events and produces one data point per
 * answered clue, updating the affected point in place when a check is
 * corrected afterwards.
 */
export function buildChartData(
  game: Game,
  players: Player[],
  roomEvents: Action[],
): DataPoint[] {
  const initialPoint: DataPoint = {
    x: 0,
    ...Object.fromEntries(players.map((player) => [player.userId, 0])),
    wagerable: 0,
  };
  const data = [initialPoint];

  let wipState = stateFromGame(game);
  let counter = 0;
  let lastPointClue: string | null = null;

  for (const re of roomEvents) {
    const prevNumAnswered = wipState.numAnswered;
    const prevState = wipState;

    wipState = gameEngine(wipState, re);
    const activeClue = wipState.activeClue;

    if (wipState.numAnswered !== prevNumAnswered && activeClue) {
      counter += 1;
      const [i, j] = activeClue;
      const clueAnswer = wipState.isAnswered[wipState.round][i][j];
      const clue = game.boards[wipState.round].categories[j].clues[i];

      const point: DataPoint = {
        x: counter,
        wagerable: clue.wagerable ? 1 : 0,
      };
      for (const [userId] of clueAnswer.answeredBy) {
        const player = getPlayer(wipState, userId);
        point[userId] = player?.score ?? 0;
      }
      data.push(point);
      lastPointClue = `${wipState.round},${i},${j}`;
    }

    // A correction rewrites scores without advancing numAnswered, so bring
    // the already-recorded point for that clue up to date. Only an accepted
    // correction counts: the reducer returns the same state reference for
    // rejected ones (e.g. a stale event stored after the window closed),
    // and patching on those could copy unrelated in-flight scores backwards.
    if (isCorrectCheckAction(re) && wipState !== prevState && data.length > 1) {
      const { round, i, j } = re.payload;
      if (lastPointClue === `${round},${i},${j}`) {
        const lastPoint = data[data.length - 1];
        const clueAnswer = wipState.isAnswered[round][i][j];
        const affected = new Set([
          ...Object.keys(lastPoint).filter(
            (key) => key !== "x" && key !== "wagerable",
          ),
          ...clueAnswer.answeredBy.keys(),
        ]);
        for (const userId of affected) {
          const player = getPlayer(wipState, userId);
          lastPoint[userId] = player?.score ?? 0;
        }
      }
    }
  }

  return data;
}

/** Chart is a line chart of each player's score over time. */
export default function Chart({
  game,
  players,
  roomEvents,
}: {
  game: Game;
  players: Player[];
  roomEvents: Action[];
}) {
  const data = buildChartData(game, players, roomEvents);

  const roundBoundaries = game.boards.reduce((acc, _board, i) => {
    const cluesInBoard = getNumCluesInBoard(game, i);
    const prev = acc.length ? acc[acc.length - 1] : 0;
    const next = prev + cluesInBoard;
    return [...acc, next];
  }, new Array<number>());

  return (
    <>
      <h2 className="text-2xl">Scores over time</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <XAxis dataKey="x">
            <Label value="Clue" offset={-5} position="insideBottom" />
          </XAxis>
          <YAxis tick={(props) => <AngledAxisTick {...props} />}>
            <Label value="Score" angle={-90} position="insideLeft" />
          </YAxis>
          <Tooltip />
          <Legend />
          {/* A vertical reference line to separate each round */}
          {roundBoundaries.map((x, i) => (
            <ReferenceLine key={i} x={x} strokeDasharray="3 3" />
          ))}
          {/* Horizontal reference line at score 0 */}
          <ReferenceLine y={0} strokeDasharray="3 3" />
          {players.map((player) => (
            <Line
              name={player.name}
              connectNulls
              key={player.userId}
              type="stepAfter"
              dataKey={player.userId}
              stroke={getPlayerColor(player)}
              dot={(props) => <CustomDot {...props} />}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}
