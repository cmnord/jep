import Head from "next/head";
import { useRouter } from "next/router";
import React from "react";
import Game from "../components/Game";

export default function DatePicker() {
  const router = useRouter();
  const { year: yearStr, month: monthStr, day: dayStr } = router.query;
  if (
    typeof yearStr !== "string" ||
    typeof monthStr !== "string" ||
    typeof dayStr !== "string"
  ) {
    return null;
  }
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Month must be 0-indexed, so subtract 1.
  const date = new Date(year, month - 1, day);
  const dateStr = date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <Head>
        <title>J!, {dateStr}</title>
        <meta name="description" content="A J! trivia app" />
        <link
          rel="icon"
          href="https://cdn.glitch.com/a0ea5fd0-c422-4261-8950-fdebebccb098%2Fjeopardy.png?v=1604939463216"
          type="image/png"
          sizes="16x16"
        />
      </Head>

      <main>
        <Game year={year} month={month} day={day} />
      </main>
    </div>
  );
}
