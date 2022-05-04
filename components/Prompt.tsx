import { Clue, } from "../pages/api/gameResponse";
import styles from "../styles/Prompt.module.css";
import cn from "classnames";
import { useEffect, useState } from 'react';

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
	Clue,
	Answer,
}

export default function Prompt(props: Props) {
	const getInitialState = () => {
		if (props.clue?.isDailyDouble) {
			return State.DailyDouble;
		} else if (props.clue?.isFinal) {
			return State.Final;
		}
		return State.Clue;
	}

	const initialState = getInitialState();
	const [state, setState] = useState(initialState);
	const now = Date.now();
	const [start, setStart] = useState(now);
	const [progress, setProgress] = useState(now);

	useEffect(() => {
		const now = Date.now();
		setStart(now);
		setProgress(now);
		setState(getInitialState());
		if (props.clue) {
			const interval = setInterval(() => {
				setProgress(Date.now());
			}, 1000);
			return () => clearInterval(interval);
		}
	}, [props.clue]);

	const handleClick = () => {
		switch (state) {
			case State.DailyDouble:
			case State.Final:
				setState(State.Clue);
				return;
			case State.Clue:
				setState(State.Answer);
				return;
			case State.Answer:
				props.onClick();
		}
	}

	const renderContent = () => {
		switch (state) {
			case State.DailyDouble:
				return <span>Daily Double</span>;
			case State.Final:
				return <span>{props.clue?.category}</span>;
			case State.Clue:
			case State.Answer:
				return <div>
					<div>{props.clue?.clue}</div>
					<div className={cn(styles.answer, {
						[styles.answerHidden]: state === State.Clue,
						[styles.answerShow]: state === State.Answer,
					})}>
						{props.clue?.answer}
					</div>
				</div>;
		}
	};

	const calculateWidth = () => {
		const numCharactersInClue = props.clue?.clue.length ?? 0;
		const clueDurationMS = MS_PER_CHARACTER * numCharactersInClue;
		const diff = progress - start;
		if (diff <= 0) {
			return 0;
		} else if (diff > clueDurationMS) {
			return 100;
		}
		return (diff / clueDurationMS) * 100;
	}
	const width = calculateWidth();

	return <div className={cn(styles.prompt, {
		[styles.isActive]: props.clue !== undefined,
	})} onClick={handleClick}>
		<div className={styles.text}>{renderContent()}</div>
		<div className={styles.timer} style={{ width: `${width}%` }} />
	</div>;
}