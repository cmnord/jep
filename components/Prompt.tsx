import { Clue, } from "../pages/api/gameResponse";
import styles from "../styles/Prompt.module.css";
import cn from "classnames";

interface Props {
	clue?: Clue;
	onClick: () => void;
}

export default function Prompt(props: Props) {
	const content = props.clue?.isDailyDouble ? "Daily Double" : props.clue?.clue;
	return <div className={cn(styles.prompt, {
		[styles.isActive]: props.clue !== undefined,
	})} onClick={props.onClick}>{content}</div>;
}