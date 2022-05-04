import styles from "../styles/Preview.module.css";
// import cn from "classnames";

export function DoublePreview(props: {
	onClick: () => void;
}) {
	return <Preview onClick={props.onClick}>
		double preview yay
	</Preview>;
}

export function SinglePreview(props: {
	year: number;
	month: number;
	day: number;
	onClick: () => void;
}) {
	const date = new Date(props.year, props.month, props.day);
	const dateStr = date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
	return <Preview onClick={props.onClick}>
		<h2>Play &rarr;</h2>
		<p>Click to play {dateStr}</p>
	</Preview>;
}

interface Props {
	onClick: () => void;
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