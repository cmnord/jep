import { useState } from "react";
import Link from "next/link";

export default function DatePicker() {
  const [date, setDate] = useState(new Date(Date.now()))

  const handleChangeDate = (dateString: string) => {
    const newDate: Date = new Date(dateString + 'T00:00');
    setDate(newDate);
  }

  /** toDateValue converts the Date to YYYY-MM-DD */
  const toDateValue = (date: Date): string => {
    return date.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }

  return (
    <form>
      <label>Game Date:</label>
      <input type="date" value={toDateValue(date)} onChange={(e) => handleChangeDate(e.target.value)} />

      <button type="submit">
        <Link
          href={{
            pathname: "/game",
            query: {
              year: date.getFullYear(),
              month: date.getMonth(),
              day: date.getDay(),
            }
          }}
        >
          <span>Play this game {date.toString()}</span>
        </Link>
      </button>
    </form>);
}