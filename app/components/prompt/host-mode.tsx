import * as React from "react";

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
 * The host checks on behalf of the winning buzzer. */
export function HostModeCheckForm({ roomId }: { roomId: RoomProps["roomId"] }) {
  const { winningBuzzer, activeClue } = useEngineContext();

  if (!activeClue || !winningBuzzer) {
    return null;
  }

  return (
    <ConnectedCheckForm
      roomId={roomId}
      userId={winningBuzzer}
      showAnswer={true}
      onClickShowAnswer={() => {}}
      isHostMode={true}
    />
  );
}
