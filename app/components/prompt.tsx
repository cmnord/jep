import * as React from "react";
import classNames from "classnames";
import { Clue } from "~/models/convert.server";

/** MS_PER_CHARACTER is a heuristic value to scale the amount of time per clue by
 * its length.
 */
const MS_PER_CHARACTER = 50;

enum State {
  DailyDouble,
  Final,
  ShowClue,
  Answer,
}

function Fade({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) {
  const [shouldRender, setRender] = React.useState(show);

  React.useEffect(() => {
    if (show) setRender(true);
  }, [show]);

  const onAnimationEnd = () => {
    if (!show) setRender(false);
  };

  return shouldRender ? (
    <div
      className={classNames("fixed left-0 top-0", {
        "animate-slideIn": show,
        "animate-slideOut": !show,
      })}
      onAnimationEnd={onAnimationEnd}
    >
      {children}
    </div>
  ) : null;
}

export default function Prompt({
  clue,
  category,
  onClose,
}: {
  clue?: Clue;
  category?: string;
  onClose: () => void;
}) {
  const getInitialState = () => {
    if (clue?.isDailyDouble) {
      return State.DailyDouble;
    }
    /* TODO: final
    if (clue?.isFinal) {
      return State.Final;
    }
    */
    return State.ShowClue;
  };

  const initialState = getInitialState();
  const [state, setState] = React.useState(initialState);
  const now = Date.now();
  const [start, setStart] = React.useState(now);
  const [progress, setProgress] = React.useState(now);

  React.useEffect(() => {
    const newNow = Date.now();
    setStart(newNow);
    setProgress(newNow);
    setState(getInitialState());
    if (clue) {
      const interval = setInterval(() => {
        setProgress(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [clue]);

  const handleClick = () => {
    switch (state) {
      case State.DailyDouble:
      case State.Final:
        return setState(State.ShowClue);
      case State.ShowClue:
        return setState(State.Answer);
      case State.Answer:
        return onClose();
    }
  };

  const renderContent = () => {
    switch (state) {
      case State.DailyDouble:
        return <span>Daily Double</span>;
      case State.Final:
        return <span>{category}</span>;
      case State.ShowClue:
      case State.Answer:
        return (
          <div>
            <p className="mb-8">{clue?.clue}</p>
            <p
              className={classNames("text-cyan-300", {
                "opacity-0": state === State.ShowClue,
              })}
            >
              {clue?.answer}
            </p>
          </div>
        );
    }
  };

  const calculateWidth = () => {
    const numCharactersInClue = clue?.clue.length ?? 0;
    const clueDurationMS = MS_PER_CHARACTER * numCharactersInClue;
    const diff = progress - start;
    if (diff <= 0) {
      return 0;
    }
    if (diff > clueDurationMS) {
      return 100;
    }
    return (diff / clueDurationMS) * 100;
  };
  const width = calculateWidth();

  return (
    <Fade show={clue !== undefined}>
      <button
        className={classNames(
          "h-screen w-screen bg-blue-1000 flex flex-col justify-center items-center"
        )}
        onClick={handleClick}
        role="button"
        autoFocus
        tabIndex={0}
      >
        <div className="p-4 flex flex-grow items-center">
          <div className="text-white uppercase text-center text-4xl md:text-5xl lg:text-7xl leading-relaxed text-shadow-3 font-korinna">
            {renderContent()}
          </div>
        </div>
        <div className="timer" style={{ width: `${width}%` }} />
      </button>
    </Fade>
  );
}
