import cn from "classnames";
import React, { Fragment, KeyboardEvent } from "react";
import { Board, Category, Clue } from "../pages/api/gameResponse";
import styles from "../styles/Board.module.css";
import BoardState from "../lib/board_state";

export enum Round {
  Single = 1,
  Double,
  Final,
  End,
}

export const NUM_CATEGORIES = 6;
export const NUM_CLUES_PER_CATEGORY = 5;

interface Props {
  round: Round;
  board?: Board;
  boardState?: BoardState;
  onClickClue: (categoryIdx: number, clueIdx: number) => void;
}

/** BoardComponent is purely presentational and renders the board. */
export default function BoardComponent(props: Props) {
  const handleClickClueKeyboard = (
    e: KeyboardEvent<HTMLDivElement>,
    i: number,
    j: number
  ) => {
    if (e.key !== "Enter") {
      return;
    }
    props.onClickClue(i, j);
  };

  const renderClue = (clue: Clue | undefined, i: number, j: number) => {
    const clueValue = (j + 1) * 200 * props.round.valueOf();
    const isActive = Boolean(props.boardState?.get(i, j)?.isActive);
    const isAnswered =
      Boolean(props.boardState?.get(i, j)?.isAnswered) && !isActive;
    const clueText = isAnswered ? (
      <div className={styles.answeredQuestion}>
        {clue?.isDailyDouble ? <p>DAILY DOUBLE</p> : null}
        <p>{clue?.clue}</p>
        <p className={styles.answer}>{clue?.answer}</p>
      </div>
    ) : (
      `$${clueValue}`
    );
    return (
      <div
        key={`clue-${i}-${j}`}
        className={cn(styles.question, {
          [styles.isAnswered]: isAnswered,
          [styles.isActive]: isActive,
        })}
        onClick={() => props.onClickClue(i, j)}
        onKeyDown={(e) => handleClickClueKeyboard(e, i, j)}
        role="button"
        tabIndex={i * NUM_CLUES_PER_CATEGORY + j + 1}
      >
        {clueText}
      </div>
    );
  };

  const renderCategory = (category: Category | undefined, i: number) => {
    const categoryTitle = category?.name ?? "loading...";
    const clues = new Array<Clue | undefined>(NUM_CLUES_PER_CATEGORY);
    for (let j = 0; j < NUM_CLUES_PER_CATEGORY; j += 1) {
      clues[j] = category?.clues[j];
    }
    return (
      <Fragment key={`category-${i}`}>
        <div className={styles.category} key={`category-name-${i}`}>
          {categoryTitle}
        </div>
        {clues.map((clue, j) => renderClue(clue, i, j))}
      </Fragment>
    );
  };

  const categories = new Array<Category | undefined>(NUM_CATEGORIES);
  for (let i = 0; i < NUM_CATEGORIES; i += 1) {
    categories[i] = props.board?.categories[i];
  }
  return <div className={styles.board}>{categories.map(renderCategory)}</div>;
}
