import * as React from "react";
import { useFetcher } from "react-router";

import Button from "~/components/button";
import { Dollars, DollarsDiff } from "~/components/dollars";
import type { RoomProps } from "~/components/game";
import {
  UndoArmingContext,
  UndoCheckButton,
  UndoCheckConfirm,
} from "~/components/undo-check";
import type { Action } from "~/engine";
import { GameState, useEngineContext } from "~/engine";
import { useTranslation } from "~/i18n";
import useSoloAction from "~/utils/use-solo-action";
import useTimeout from "~/utils/use-timeout";

const DEFAULT_COUNTDOWN_MS = 3000;

interface PlayerScore {
  name: string;
  correct: boolean;
  value: number;
  score: number;
}

function PlayerScores({
  answerers,
  boardControlName,
  wagerable,
  longForm,
  skipped,
  skippedByHost = false,
}: {
  answerers: PlayerScore[];
  /** The site admin (or the host) skipped the question. */
  skipped: boolean;
  /** …the host did (feature 22). */
  skippedByHost?: boolean;
  /** undefined when this user has board control. */
  boardControlName: string | undefined;
  wagerable: boolean;
  longForm: boolean;
}) {
  const { t } = useTranslation();
  if (!answerers.length) {
    if (skipped) {
      return (
        <p className="font-bold text-white">
          {skippedByHost ? t("host.skipped") : t("play.next.skipped")}
        </p>
      );
    }
    if (wagerable && longForm) {
      return (
        <p className="font-bold text-white">{t("play.next.noOneCanWager")}</p>
      );
    } else if (wagerable) {
      return (
        <p className="font-bold text-white">
          {boardControlName === undefined
            ? t("play.notEnoughToWager")
            : t("play.next.playerCantWager", { name: boardControlName })}
        </p>
      );
    } else {
      return <p className="font-bold text-white">{t("play.next.noOneWon")}</p>;
    }
  }
  return (
    <div className="flex gap-2">
      {answerers.map(({ name, correct, value, score }, i) => {
        return (
          <div className="relative" key={i}>
            <div className="flex flex-col items-center text-shadow" key={i}>
              <span className="font-handwriting text-xl font-bold text-slate-300">
                {name}
              </span>
              <Dollars amount={score} variant="reveal" />
            </div>
            <DollarsDiff
              amount={correct ? value : -1 * value}
              variant="floating"
            />
          </div>
        );
      })}
    </div>
  );
}

export function ConnectedNextClueForm({ roomId, userId }: RoomProps) {
  const {
    activeClue,
    activeClueSkipped,
    activeClueSkippedByHost,
    answeredBy,
    host,
    clue,
    getCheckCorrection,
    getClueValue,
    players,
    boardControl,
    soloDispatch,
    type,
  } = useEngineContext();

  if (!activeClue || !clue) {
    throw new Error("No active clue");
  }

  const { t } = useTranslation();
  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);
  const loading = fetcher.state === "loading";
  const formRef = React.useRef<HTMLFormElement | null>(null);

  const { armed: confirmingUndo, setArmed: setConfirmingUndo } =
    React.useContext(UndoArmingContext);

  const boardController = boardControl ? players.get(boardControl) : undefined;
  const boardControlName = boardController
    ? boardController.userId === userId
      ? undefined
      : boardController.name
    : t("play.next.unknownPlayer");

  const [i, j] = activeClue;

  const answerers = Array.from(players.values())
    .map((player) => ({
      name: player.name,
      correct: answeredBy(i, j, player.userId),
      score: player.score,
      value: getClueValue(activeClue, player.userId),
    }))
    .filter((p): p is PlayerScore => p.correct !== undefined);

  const hasBoardControl = boardControl === userId;
  const isRevealingAnswer = type === GameState.ReadLongFormClue;
  // Host mode (feature 22): the host moves on, and verdicts are the host's
  // (players have nothing to undo).
  const hostMode = host !== null;
  const isHost = host?.userId === userId;
  const canMoveOn = hostMode ? isHost : hasBoardControl || clue.longForm;
  const autoAdvance = hostMode ? isHost : hasBoardControl;
  const correction = hostMode ? undefined : getCheckCorrection(userId);

  // Submit the form by default after a few seconds. Pause the countdown
  // while the undo confirmation is armed so it can't be yanked away
  // mid-decision.
  useTimeout(
    () => {
      fetcher.submit(formRef.current);
    },
    autoAdvance && !clue.longForm && !confirmingUndo
      ? DEFAULT_COUNTDOWN_MS
      : null,
  );

  return (
    <div className="flex flex-col items-center gap-2 p-2">
      {!isRevealingAnswer && (
        <PlayerScores
          answerers={answerers}
          boardControlName={boardControlName}
          wagerable={clue.wagerable ?? false}
          longForm={clue.longForm ?? false}
          skipped={activeClueSkipped}
          skippedByHost={activeClueSkippedByHost}
        />
      )}
      {correction && confirmingUndo ? (
        <UndoCheckConfirm
          roomId={roomId}
          userId={userId}
          prompt={t("play.undo.thisClue")}
          onCancel={() => setConfirmingUndo(false)}
        />
      ) : (
        <div className="flex gap-2">
          {correction ? (
            <UndoCheckButton onClick={() => setConfirmingUndo(true)} />
          ) : null}
          {canMoveOn ? (
            <fetcher.Form
              method="POST"
              action={`/room/${roomId}/next-clue`}
              ref={formRef}
            >
              <input type="hidden" value={userId} name="userId" />
              <input type="hidden" value={i} name="i" />
              <input type="hidden" value={j} name="j" />
              <Button
                variant="primary"
                type="submit"
                autoFocus
                loading={loading}
              >
                <div
                  className="absolute left-0 h-full rounded-md bg-blue-400"
                  style={{
                    animation:
                      clue.longForm || confirmingUndo
                        ? undefined
                        : `${
                            DEFAULT_COUNTDOWN_MS / 1000
                          }s linear 0s 1 growFromLeft forwards`,
                  }}
                />
                <span className="relative">
                  {isRevealingAnswer
                    ? t("play.check.revealAnswer")
                    : t("play.next.backToBoard")}
                </span>
              </Button>
            </fetcher.Form>
          ) : hostMode ? (
            <p className="text-sm text-slate-300">
              {t("host.player.hostMovesOn")}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
