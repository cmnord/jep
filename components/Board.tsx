import { Board, Category, Clue } from "../pages/api/gameResponse";
import styles from "../styles/Board.module.css";
import cn from "classnames";

export enum Round {
	Single = 1,
	Double,
	Final,
	End,
}

export const NUM_CATEGORIES = 6;
export const NUM_CLUES_PER_CATEGORY = 5;

type Tuple<T, N extends number> = N extends N ? number extends N ? T[] : _TupleOf<T, N, []> : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R['length'] extends N ? R : _TupleOf<T, N, [T, ...R]>;

type CategoryState = Tuple<ClueState, 5>;
type BoardTuple = Tuple<CategoryState, 6>;

export class ClueState {
	isActive: boolean;
	isAnswered: boolean;

	constructor() {
		this.isActive = false;
		this.isAnswered = false;
	}
}

export class BoardState {
	state: BoardTuple;

	constructor() {
		this.state = [
			[new ClueState(), new ClueState(), new ClueState(), new ClueState(), new ClueState()],
			[new ClueState(), new ClueState(), new ClueState(), new ClueState(), new ClueState()],
			[new ClueState(), new ClueState(), new ClueState(), new ClueState(), new ClueState()],
			[new ClueState(), new ClueState(), new ClueState(), new ClueState(), new ClueState()],
			[new ClueState(), new ClueState(), new ClueState(), new ClueState(), new ClueState()],
			[new ClueState(), new ClueState(), new ClueState(), new ClueState(), new ClueState()],
		];
	}

	get(i: number, j: number) {
		return this.state[i][j];
	}

	setActive(i: number, j: number) {
		this.state[i][j].isActive = true;
	}
}

interface Props {
	round: Round;
	board?: Board;
	boardState?: BoardState;
	onClickClue: (categoryIdx: number, clueIdx: number) => void;
}

/** BoardComponent is purely presentational and renders the board. */
export default function BoardComponent(props: Props) {
	const renderClue = (i: number) => (clue: Clue | undefined, j: number) => {
		const clueValue = (j + 1) * 200 * props.round.valueOf();
		const isActive = Boolean(props.boardState?.get(i, j)?.isActive);
		const isAnswered = Boolean(props.boardState?.get(i, j)?.isAnswered) && !isActive;
		const clueText = isAnswered ? (
			<div>
				{clue?.isDailyDouble ? <p>DAILY DOUBLE</p> : null}
				<p>{clue?.clue}</p>
				<p className={styles.answer}>{clue?.answer}</p>
			</div>
		) : `$${clueValue}`;
		return <div className={cn(styles.question, {
			[styles.isAnswered]: isAnswered,
			[styles.isActive]: isActive,
		})
		} onClick={() => props.onClickClue(i, j)
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