import { useFetcher } from "@remix-run/react";
import classNames from "classnames";
import * as React from "react";
import useFitText from "use-fit-text";
import useSound from "use-sound";

import {
  Action,
  CANT_BUZZ_FLAG,
  CLUE_TIMEOUT_MS,
  GameState,
  useEngineContext,
} from "~/engine";
import useKeyPress from "~/utils/use-key-press";
import { useSoloAction } from "~/utils/use-solo-action";
import { useTimeout } from "~/utils/use-timeout";

import { ConnectedAnswerForm as AnswerForm } from "./answer-form";
import { Buzzes } from "./buzz";
import { Countdown } from "./countdown";
import { Fade } from "./fade";
import { Kbd } from "./kbd";
import { Lockout } from "./lockout";
import { NextClueForm } from "./next-clue-form";
import { ReadClueTimer } from "./read-clue-timer";
import ShinyText from "./shiny-text";
import WagerForm from "./wager-form";

/** MS_PER_CHARACTER is a heuristic value to scale the amount of time per clue by
 * its length.
 */
const MS_PER_CHARACTER = 70;

/** CLUE_READ_OFFSET is the base amount of time it takes to read a clue. */
const CLUE_READ_OFFSET = 500;

/** LOCKOUT_MS applies a 250ms lockout if a contestant buzzes before the clue is
 * read.
 */
const LOCKOUT_MS = 250;

const TIMES_UP_SFX = "/sounds/times-up.mp3";

function ClueText({
  answer,
  canBuzz,
  clue,
  focusOnBuzz,
  onBuzz,
  showAnswer,
}: {
  answer?: string;
  canBuzz: boolean;
  clue?: string;
  focusOnBuzz: boolean;
  onBuzz: (buzzedAt: number) => void;
  showAnswer: boolean;
}) {
  const { fontSize, ref } = useFitText({ minFontSize: 20, maxFontSize: 400 });

  return (
    <button
      type="button"
      disabled={!canBuzz}
      onClick={() => onBuzz(Date.now())}
      className={
        "p-4 max-w-screen-lg mx-auto flex flex-col justify-center grow " +
        "uppercase text-shadow-lg font-korinna font-bold"
      }
      autoFocus={focusOnBuzz}
    >
      <p
        className="text-white word-spacing-1 leading-normal w-full max-h-96"
        ref={ref}
        style={{
          fontSize,
        }}
      >
        {clue}
        <br />
        <span
          className={classNames("text-cyan-300", {
            "opacity-0": !showAnswer,
          })}
        >
          {answer}
        </span>
      </p>
    </button>
  );
}

/** WagerCluePrompt handles all frontend behavior while the game state is
 * GameState.WagerClue.
 */
function WagerCluePrompt({
  roomName,
  userId,
}: {
  roomName: string;
  userId: string;
}) {
  const { buzzes, category, players } = useEngineContext();

  return (
    <>
      <Countdown startTime={undefined} />
      <ReadClueTimer clueDurationMs={0} shouldAnimate={false} />
      <div className="flex justify-between p-4">
        <div className="text-white">
          <span className="font-bold">{category}</span>
        </div>
      </div>
      <div className="p-4 max-w-screen-lg mx-auto flex flex-col justify-center grow gap-4">
        <ShinyText text="double down" />
        <WagerForm roomName={roomName} userId={userId} />
      </div>
      <Buzzes
        buzzes={buzzes}
        players={players}
        winningBuzzer={undefined}
        showWinner={false}
        buzzCorrect={false}
        clueValue={0}
      />
    </>
  );
}

/** ReadCluePrompt handles all frontend behavior while the game state is
 * GameState.ReadClue.
 */
function ReadCluePrompt({
  roomName,
  userId,
}: {
  roomName: string;
  userId: string;
}) {
  const {
    activeClue,
    buzzes,
    category,
    clue,
    getClueValue,
    players,
    soloDispatch,
  } = useEngineContext();

  const [optimisticBuzzes, setOptimisticBuzzes] = React.useState(
    buzzes ?? new Map<string, number>()
  );
  const myBuzzDurationMs = optimisticBuzzes?.get(userId);

  const [clueShownAt, setClueShownAt] = React.useState<number | undefined>(
    myBuzzDurationMs !== undefined ? 0 : undefined
  );
  const [clueIdx, setClueIdx] = React.useState(activeClue);

  const [buzzerOpenAt, setBuzzerOpenAt] = React.useState<number | undefined>(
    myBuzzDurationMs !== undefined ? 0 : undefined
  );
  const [lockout, setLockout] = React.useState(false);

  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);

  const numCharactersInClue = clue?.clue.length ?? 0;
  const clueDurationMs =
    CLUE_READ_OFFSET + MS_PER_CHARACTER * numCharactersInClue;

  // Keep activeClue set to the last valid clue index.
  React.useEffect(() => {
    if (activeClue) {
      setClueShownAt(Date.now());
      setClueIdx(activeClue);
      setBuzzerOpenAt(myBuzzDurationMs !== undefined ? 0 : undefined);
    } else {
      setClueShownAt(undefined);
      setBuzzerOpenAt(undefined);
    }
  }, [activeClue, myBuzzDurationMs]);

  // Update optimisticBuzzes once buzzes come in from the server.
  React.useEffect(() => {
    setOptimisticBuzzes(buzzes ?? new Map<string, number>());
  }, [buzzes]);

  // Open the buzzer after the clue is done being "read".
  const delayMs = myBuzzDurationMs === undefined ? clueDurationMs : null;
  useTimeout(() => setBuzzerOpenAt(Date.now()), delayMs);

  // Remove the lockout after 500ms.
  useTimeout(() => setLockout(false), lockout ? LOCKOUT_MS : null);

  // If the contestant doesn't buzz for 5 seconds, close the buzzer and send a
  // 5-second "non-buzz" buzz to the server.
  useTimeout(
    () => {
      const deltaMs = CLUE_TIMEOUT_MS + 1;
      setOptimisticBuzzes((old) => {
        if (old.has(userId)) {
          return old;
        }
        return new Map([...old, [userId, deltaMs]]);
      });
      const [i, j] = clueIdx ?? [-1, -1];
      return fetcher.submit(
        {
          i: i.toString(),
          j: j.toString(),
          userId,
          deltaMs: deltaMs.toString(),
        },
        { method: "post", action: `/room/${roomName}/buzz` }
      );
    },
    buzzerOpenAt !== undefined && clueIdx ? CLUE_TIMEOUT_MS : null
  );

  // Play the "time's up" sound after 5 seconds if no one buzzed in.
  const [playTimesUpSfx] = useSound(TIMES_UP_SFX, { volume: 0.5 });
  useTimeout(
    playTimesUpSfx,
    buzzerOpenAt !== undefined &&
      !Array.from(optimisticBuzzes.values()).some(
        (v) => v !== CANT_BUZZ_FLAG && v < CLUE_TIMEOUT_MS
      )
      ? CLUE_TIMEOUT_MS
      : null
  );

  const handleClick = (clickedAtMs: number) => {
    if (
      clueShownAt === undefined ||
      lockout ||
      myBuzzDurationMs !== undefined
    ) {
      return;
    }

    const lockoutDeltaMs = clickedAtMs - clueShownAt;
    if (lockoutDeltaMs < clueDurationMs) {
      return setLockout(true);
    }

    if (buzzerOpenAt === undefined || !clueIdx) {
      return;
    }

    // Contestant buzzed, so submit their buzz time
    const [i, j] = clueIdx;
    const clueDeltaMs = clickedAtMs - buzzerOpenAt;

    setOptimisticBuzzes((old) => old.set(userId, clueDeltaMs));

    return fetcher.submit(
      {
        i: i.toString(),
        j: j.toString(),
        userId,
        deltaMs: clueDeltaMs.toString(),
      },
      { method: "post", action: `/room/${roomName}/buzz` }
    );
  };

  useKeyPress("Enter", () => handleClick(Date.now()));

  const clueValue = getClueValue(clueIdx ?? [-1, -1]);

  return (
    <>
      <Countdown startTime={buzzerOpenAt} />
      <ReadClueTimer
        clueDurationMs={clueDurationMs}
        shouldAnimate={myBuzzDurationMs === undefined}
      />
      <div className="flex justify-between p-4">
        <div className="text-white">
          <span className="font-bold">{category}</span> for{" "}
          <span className="font-bold">${clueValue}</span>
        </div>
        <span className="text-sm text-gray-300">
          Click or press <Kbd>Enter</Kbd> to buzz in
        </span>
      </div>
      <ClueText
        clue={clue?.clue}
        canBuzz={!lockout && myBuzzDurationMs === undefined}
        onBuzz={() => handleClick(Date.now())}
        focusOnBuzz={true}
        showAnswer={false}
        answer={undefined}
      />
      {/* placed here for spacing so clue doesn't resize */}
      <AnswerForm
        isOpen={false}
        roomName={""}
        userId={""}
        clueIdx={undefined}
        showAnswer={false}
        onClickShowAnswer={() => null}
      />
      <Lockout active={lockout} />
      <Buzzes
        buzzes={optimisticBuzzes}
        players={players}
        winningBuzzer={undefined}
        showWinner={false}
        buzzCorrect={false}
        clueValue={clueValue}
      />
    </>
  );
}

/** RevealAnswerToBuzzerPrompt handles all frontend behavior while the game state
 * is GameState.ReadAnswerToBuzzer.
 */
function RevealAnswerToBuzzerPrompt({
  roomName,
  userId,
}: {
  roomName: string;
  userId: string;
}) {
  const {
    activeClue,
    buzzes,
    category,
    clue,
    getClueValue,
    players,
    winningBuzzer,
  } = useEngineContext();

  const clueValue = getClueValue(activeClue ?? [-1, -1]);

  const canShowAnswer = winningBuzzer === userId;
  const [showAnswer, setShowAnswer] = React.useState(false);

  // Play the "time's up" sound after 5 seconds if the contestant can reveal the
  // answer but hasn't yet.
  const [playTimesUpSfx] = useSound(TIMES_UP_SFX, { volume: 0.5 });
  useTimeout(
    playTimesUpSfx,
    canShowAnswer && !showAnswer ? CLUE_TIMEOUT_MS : null
  );

  return (
    <>
      <Countdown startTime={canShowAnswer ? Date.now() : undefined} />
      <ReadClueTimer clueDurationMs={0} shouldAnimate={false} />
      <div className="flex justify-between p-4">
        <div className="text-white">
          <span className="font-bold">{category}</span> for{" "}
          <span className="font-bold">${clueValue}</span>
        </div>
        <span className="text-sm text-gray-300">
          Click or press <Kbd>Enter</Kbd> to buzz in
        </span>
      </div>
      <ClueText
        answer={clue?.answer}
        canBuzz={false}
        clue={clue?.clue}
        focusOnBuzz={false}
        onBuzz={() => null}
        showAnswer={canShowAnswer && showAnswer}
      />
      <AnswerForm
        isOpen={canShowAnswer}
        roomName={roomName}
        userId={userId}
        clueIdx={activeClue}
        showAnswer={canShowAnswer && showAnswer}
        onClickShowAnswer={
          canShowAnswer ? () => setShowAnswer(true) : () => null
        }
      />
      <Buzzes
        buzzes={buzzes}
        players={players}
        winningBuzzer={winningBuzzer}
        showWinner={false}
        buzzCorrect={false}
        clueValue={clueValue}
      />
    </>
  );
}

/** RevealAnswerToAllPrompt handles all frontend behavior while the game state is
 * GameState.ReadAnswerToAll.
 */
function RevealAnswerToAllPrompt({
  roomName,
  userId,
}: {
  roomName: string;
  userId: string;
}) {
  const {
    activeClue,
    answeredBy,
    buzzes,
    category,
    clue,
    getClueValue,
    players,
    winningBuzzer,
  } = useEngineContext();

  const clueValue = getClueValue(activeClue ?? [-1, -1]);

  return (
    <>
      <Countdown startTime={undefined} />
      <ReadClueTimer clueDurationMs={0} shouldAnimate={false} />
      <div className="flex justify-between p-4">
        <div className="text-white">
          <span className="font-bold">{category}</span> for{" "}
          <span className="font-bold">${clueValue}</span>
        </div>
        <span className="text-sm text-gray-300">
          Click or press <Kbd>Enter</Kbd> to buzz in
        </span>
      </div>

      <ClueText
        clue={clue?.clue}
        canBuzz={false}
        onBuzz={() => null}
        focusOnBuzz={false}
        showAnswer={true}
        answer={clue?.answer}
      />
      <NextClueForm roomName={roomName} userId={userId} clueIdx={activeClue} />
      <Buzzes
        buzzes={buzzes}
        players={players}
        winningBuzzer={winningBuzzer}
        showWinner={true}
        buzzCorrect={
          activeClue
            ? answeredBy(activeClue[0], activeClue[1]) === winningBuzzer
            : false
        }
        clueValue={clueValue}
      />
    </>
  );
}

export function ConnectedPrompt({
  roomName,
  userId,
}: {
  roomName: string;
  userId: string;
}) {
  const { type } = useEngineContext();

  const isOpen =
    type === GameState.WagerClue ||
    type === GameState.ReadClue ||
    type === GameState.RevealAnswerToBuzzer ||
    type === GameState.RevealAnswerToAll;

  function getPromptContent() {
    switch (type) {
      case GameState.WagerClue:
        return <WagerCluePrompt roomName={roomName} userId={userId} />;
      case GameState.ReadClue:
        return <ReadCluePrompt roomName={roomName} userId={userId} />;
      case GameState.RevealAnswerToBuzzer:
        return (
          <RevealAnswerToBuzzerPrompt roomName={roomName} userId={userId} />
        );
      case GameState.RevealAnswerToAll:
        return <RevealAnswerToAllPrompt roomName={roomName} userId={userId} />;
      default:
        return null;
    }
  }

  return (
    <Fade show={isOpen}>
      <div
        className={classNames(
          "relative h-screen w-screen bg-blue-1000 flex flex-col justify-between"
        )}
      >
        {getPromptContent()}
      </div>
    </Fade>
  );
}
