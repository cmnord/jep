import { Board, Category, Clue } from "../pages/api/gameResponse";
import styles from "../styles/Board.module.css";
import cn from "classnames";

interface Props {
	step: number;
	board: Board;
	onClickClue: (categoryIdx: number, clueIdx: number) => void;
}

/** BoardComponent is purely presentational and renders the board. */
export default function BoardComponent(props: Props) {
	const renderClue = (categoryIdx: number) => (clue: Clue, clueIdx: number) => {
		const isActive = clue.order === props.step;
		const isAnswered = clue.order > 0 && !isActive;
		const clueText = isAnswered ? clue.answer : `$${clue.value}`;
		return <div className={cn(styles.question, {
			[styles.isAnswered]: isAnswered,
			[styles.isActive]: isActive,
		})
		} onClick={() => props.onClickClue(categoryIdx, clueIdx)
		}>
			{clueText}
		</div>
	}

	const renderCategory = (category: Category, categoryIdx: number) => {
		return <>
			<div className={styles.category} key={categoryIdx}>{category.name}</div>
			{category.clues.map(renderClue(categoryIdx))}
		</>;
	}
	return (<div className={styles.board}>{props.board.categories.map(renderCategory)}</div>);
}