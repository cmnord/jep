import { Clue, } from "../pages/api/gameResponse";
import styles from "../styles/Prompt.module.css";
import cn from "classnames";
import React, { MouseEvent } from "react";

interface Props {
	clue?: Clue;
	onClick: () => void;
}
export default function Prompt(props: Props) {
	return <div className={cn(styles.prompt, {
		[styles.isActive]: props.clue !== undefined,
	})} onClick={props.onClick}>{props.clue?.clue}</div>
}