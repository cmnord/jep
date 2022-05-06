import cn from "classnames";
import React, { KeyboardEvent, useEffect, useState } from "react";
import { Clue } from "../pages/api/gameResponse";
import styles from "../styles/Prompt.module.css";

interface Props {
  clue?: Clue;
  onClick: () => void;
}

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

export default function Prompt(props: Props) {
  const getInitialState = () => {
    if (props.clue?.isDailyDouble) {
      return State.DailyDouble;
    }
    if (props.clue?.isFinal) {
      return State.Final;
    }
    return State.ShowClue;
  };

  const initialState = getInitialState();
  const [state, setState] = useState(initialState);
  const now = Date.now();
  const [start, setStart] = useState(now);
  const [progress, setProgress] = useState(now);

  useEffect(() => {
    const newNow = Date.now();
    setStart(newNow);
    setProgress(newNow);
    setState(getInitialState());
    if (props.clue) {
      const interval = setInterval(() => {
        setProgress(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [props.clue]);

  const handleClick = () => {
    switch (state) {
      case State.DailyDouble:
      case State.Final:
        return setState(State.ShowClue);
      case State.ShowClue:
        return setState(State.Answer);
      case State.Answer:
      default:
        return props.onClick();
    }
  };

  const handleClickKeyboard = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter") {
      return;
    }
    handleClick();
  };

  const renderContent = () => {
    switch (state) {
      case State.DailyDouble:
        return <span>Daily Double</span>;
      case State.Final:
        return <span>{props.clue?.category}</span>;
      case State.Answer:
      default:
        return (
          <div>
            <div>{props.clue?.clue}</div>
            <div
              className={cn(styles.answer, {
                [styles.answerHidden]: state === State.ShowClue,
                [styles.answerShow]: state === State.Answer,
              })}
            >
              {props.clue?.answer}
            </div>
          </div>
        );
    }
  };

  const calculateWidth = () => {
    const numCharactersInClue = props.clue?.clue.length ?? 0;
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
    <div
      className={cn(styles.prompt, {
        [styles.isActive]: props.clue !== undefined,
      })}
      onClick={handleClick}
      onKeyDown={handleClickKeyboard}
      role="button"
      tabIndex={props.clue !== undefined ? 0 : undefined}
    >
      <div className={styles.text}>{renderContent()}</div>
      <div className={styles.timer} style={{ width: `${width}%` }} />
    </div>
  );
}
