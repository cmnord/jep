import { Board, Category, Clue } from "../pages/api/gameResponse";
import styles from "../styles/Board.module.css";
import cn from "classnames";

interface Props {
	step: number;
	board?: Board;
	onClickClue: (categoryIdx: number, clueIdx: number) => void;
}

const NUM_CATEGORIES = 6;
const NUM_CLUES_PER_CATEGORY = 5;

/** BoardComponent is purely presentational and renders the board. */
export default function BoardComponent(props: Props) {
	const renderClue = (categoryIdx: number) => (clue: Clue | undefined, clueIdx: number) => {
		const clueValue = (clueIdx + 1) * 200;
		const isActive = clue?.order === props.step;
		const isAnswered = clue?.order && clue.order > 0 && !isActive;
		const clueText = isAnswered ? (
			<div>
				{clue.isDailyDouble ? <p>DAILY DOUBLE</p> : null}
				<p>{clue.clue}</p>
				<p className={styles.answer}>{clue.answer}</p>
			</div>
		) : `$${clueValue}`;
		return <div className={cn(styles.question, {
			[styles.isAnswered]: isAnswered,
			[styles.isActive]: isActive,
		})
		} onClick={() => props.onClickClue(categoryIdx, clueIdx)
		}>
			{clueText}
		</div>
	}

	const renderCategory = (category: Category | undefined, categoryIdx: number) => {
		const categoryTitle = category?.name ?? "loading...";
		const clues = new Array<Clue | undefined>(NUM_CLUES_PER_CATEGORY);
		for (let i = 0; i < NUM_CLUES_PER_CATEGORY; i++) {
			clues[i] = category?.clues[i]
		}
		return <>
			<div className={styles.category} key={categoryIdx}>{categoryTitle}</div>
			{clues.map(renderClue(categoryIdx))}
		</>;
	}

	const categories = new Array<Category | undefined>(NUM_CATEGORIES);
	for (let i = 0; i < NUM_CATEGORIES; i++) {
		categories[i] = props.board?.categories[i];
	}
	return (<div className={styles.board}>{categories.map(renderCategory)}</div>);
}