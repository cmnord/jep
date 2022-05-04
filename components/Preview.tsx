import styles from "../styles/Preview.module.css";
import Link from 'next/link';
import { Clue } from "../pages/api/gameResponse";

export function SinglePreview(props: {
	year: number;
	month: number;
	day: number;
	onClick: () => void;
}) {
	// Month must be 0-indexed, so subtract 1.
	const date = new Date(props.year, props.month - 1, props.day);
	const dateStr = date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
	return <Preview onClick={props.onClick}>
		<h2>Play &rarr;</h2>
		<p>Click to play {dateStr}</p>
	</Preview>;
}

export function DoublePreview(props: {
	onClick: () => void;
}) {
	return <Preview onClick={props.onClick}>
		<h2>Play Double &rarr;</h2>
		<p>Single round done! Click to play double</p>
	</Preview>;
}



export function FinalPreview(props: {
	onClick: () => void;
}) {
	return <Preview onClick={props.onClick}>
		<h2>Play Final &rarr;</h2>
		<p>Double round done! Click for Final prompt</p>
	</Preview>;
}

export function EndPreview(props: {
	finalClue?: Clue;
}) {
	return <Link href="/">
		<Preview>
			<h2>Play Again &rarr;</h2>
			<p>Game over!</p>
			<div className={styles.clue}>
				<p>{props.finalClue?.clue}</p>
				<p className={styles.answer}>{props.finalClue?.answer}</p>
			</div>
		</Preview>
	</Link>;

}

interface Props {
	onClick?: () => void;
	children?: React.ReactNode;
}

/** Preview is shown before a game or round starts. */
export default function Preview(props: Props) {
	return <div className={styles.overlay}>
		<div className={styles.modal}>
			<div className={styles.card} onClick={props.onClick}>
				{props.children}
			</div>
		</div>
	</div>;

}