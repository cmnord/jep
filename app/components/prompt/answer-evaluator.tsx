import classNames from "classnames";
import { GameState, useEngineContext } from "~/engine";
import Button from "../button";
import { ConnectedAnswerForm as AnswerForm } from "./answer-form";
import { NextClueForm } from "./next-clue-form";

/** AnswerEvaluator is shown to the winning buzzer at the bottom of the prompt.
 * They can reveal the answer, then mark it correct/incorrect, then anyone can
 * advance the round. */
export function AnswerEvaluator({
  isOpen,
  roomName,
  userId,
  clueIdx,
  showAnswer,
  onClickShowAnswer,
  loading,
}: {
  isOpen: boolean;
  roomName: string;
  userId: string;
  clueIdx: [number, number] | undefined;
  showAnswer: boolean;
  onClickShowAnswer: () => void;
  loading: boolean;
}) {
  const { type } = useEngineContext();

  if (!showAnswer) {
    return (
      <div
        className={classNames("p-2 flex flex-col items-center gap-2", {
          "opacity-0": !isOpen,
        })}
      >
        <p className="text-gray-300 text-sm">
          State your answer in the form of a question, then
        </p>
        <Button
          type="primary"
          htmlType="button"
          disabled={!isOpen}
          autoFocus={!isOpen}
          onClick={onClickShowAnswer}
          loading={loading}
        >
          Reveal answer
        </Button>
      </div>
    );
  }

  const [i, j] = clueIdx ? clueIdx : [-1, -1];

  if (type === GameState.RevealAnswerToAll) {
    return <NextClueForm roomName={roomName} userId={userId} i={i} j={j} />;
  }

  return <AnswerForm roomName={roomName} userId={userId} i={i} j={j} />;
}
