import type { NextPage } from 'next'
import Head from 'next/head'
import styles from "../styles/Home.module.css";
import { useRouter } from 'next/router';
import Game from "../components/Game";

const DatePicker: NextPage = () => {
	const router = useRouter();
	const { year: yearStr, month: monthStr, day: dayStr } = router.query;
	if (typeof yearStr !== "string" || typeof monthStr !== "string" || typeof dayStr !== "string") {
		return null;
	}
	const year = parseInt(yearStr, 10);
	const month = parseInt(monthStr, 10);
	const day = parseInt(dayStr, 10);
	return (
		<div className={styles.container}>
			<Head>
				<title>Jeopardy!</title>
				<meta name="description" content="A remixable Jeopardy web app with easily updatable answers and questions. Updated from an original version by @trentmwillis." />
				<link rel="icon" href="https://cdn.glitch.com/a0ea5fd0-c422-4261-8950-fdebebccb098%2Fjeopardy.png?v=1604939463216" type="image/png" sizes="16x16" />

				{/*<link rel="stylesheet" href="https://cdn.glitch.com/a0ea5fd0-c422-4261-8950-fdebebccb098%2FOPTIKorinna-Agency.ttf.eot?v=1604940746486" /> */}
				{/*<link rel="stylesheet" href="/style.css"></link> */}
			</Head>

			<main>
				<Game year={year} month={month} day={day} />
			</main>
		</div>
	)
}

export default DatePicker
