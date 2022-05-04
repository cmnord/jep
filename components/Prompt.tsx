import { Clue, } from "../pages/api/gameResponse";
import styles from "../styles/Prompt.module.css";
import cn from "classnames";
import { useState } from 'react';

interface Props {
	clue?: Clue;
	onClick: () => void;
}

export default function Prompt(props: Props) {
	const [clicked, setClicked] = useState(false);

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

	return <div className={cn(styles.prompt, {
		[styles.isActive]: props.clue !== undefined,
	})} onClick={handleClick}>{renderContent()}</div>;
}