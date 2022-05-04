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

export default function Prompt(props: Props) {
	const [clicked, setClicked] = useState(false);
	const now = Date.now();
	const [start, setStart] = useState(now);
	const [progress, setProgress] = useState(now);

	useEffect(() => {
		const now = Date.now();
		setStart(now);
		setProgress(now);
		if (props.clue) {
			const interval = setInterval(() => {
				setProgress(Date.now());
			}, 1000);
			return () => clearInterval(interval);
		}
	}, [props.clue]);

	const handleClick = () => {
		if ((props.clue?.isFinal || props.clue?.isDailyDouble) && !clicked) {
			setClicked(true);
			return;
		}
		props.onClick();
	}

	const renderContent = () => {
		if (props.clue?.isDailyDouble && !clicked) {
			return "Daily Double";
		} else if (props.clue?.isFinal && !clicked) {
			return props.clue?.category;
		} else {
			return props.clue?.clue;
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
		<div className={styles.text}><span>{renderContent()}</span></div>
		<div className={styles.timer} style={{ width: `${width}%` }} />
	</div>;
}