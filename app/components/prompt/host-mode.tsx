import type { RoomProps } from "~/components/game";
import { useEngineContext } from "~/engine";

import { ConnectedCheckForm } from "./check-form";

/** HostModeAnswer displays the answer in a styled box during host mode. */
export function HostModeAnswer({ answer }: { answer: string }) {
  return (
    <div className="border border-cyan-500 bg-blue-900/50 p-4">
      <p className="mb-2 text-center text-lg font-bold text-cyan-300">
        HOST MODE - ANSWER:
      </p>
      <p className="text-center font-korinna text-xl text-cyan-200">
        {answer}
      </p>
    </div>
  );
}

/** HostModeCheckForm wraps ConnectedCheckForm for host answer verification.
 * For standard clues, the host checks on behalf of the winning buzzer.
 * For long-form clues, the host checks each player who submitted an answer. */
export function HostModeCheckForm({
  roomId,
  longForm = false,
}: {
  roomId: RoomProps["roomId"];
  longForm?: boolean;
}) {
  const { winningBuzzer, activeClue, answers, players, answeredBy } =
    useEngineContext();

  if (!activeClue) {
    return null;
  }

  const [i, j] = activeClue;

  if (longForm) {
    // For long-form clues, check each player who submitted an answer.
    const playersToCheck = Array.from(answers.keys())
      .filter((uid) => players.has(uid))
      .filter((uid) => answeredBy(i, j, uid) === undefined);

    if (playersToCheck.length === 0) {
      return null;
    }

    return (
      <>
        {playersToCheck.map((uid) => (
          <ConnectedCheckForm
            key={uid}
            roomId={roomId}
            userId={uid}
            showAnswer={true}
            onClickShowAnswer={() => {}}
            longForm={true}
            playerName={players.get(uid)?.name ?? "Unknown player"}
          />
        ))}
      </>
    );
  }

  // Standard clue: check the winning buzzer.
  if (!winningBuzzer) {
    return null;
  }

  return (
    <ConnectedCheckForm
      roomId={roomId}
      userId={winningBuzzer}
      showAnswer={true}
      onClickShowAnswer={() => {}}
      playerName={players.get(winningBuzzer)?.name ?? "Unknown player"}
    />
  );
}
