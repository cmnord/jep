import useSWR from "swr";
import { useEffect, useState } from "react";
import { GameResponse, Board, Round, Category } from "../pages/api/gameResponse";
import BoardComponent from "./Board";

interface Props {
	year: number;
	month: number;
	day: number;
}

const emptyCategory: Category = {
	name: "",
	clues: []
}

const emptyBoard: Board = {
	round: Round.Jeopardy,
	categories: [emptyCategory, emptyCategory, emptyCategory, emptyCategory, emptyCategory],
}

/** Game maintains the game state. */
export default function Game(props: Props) {
	const [board, setBoard] = useState<Board>(emptyBoard);

	const { data, error } = useSWR<GameResponse>(`/api/mockGameResponse?year=${props.year}&month=${props.month}&day=${props.day}`,
		(input, init) => fetch(input, init).then((res) => res.json()));

	useEffect(() => {
		if (data && !data.error && data.game?.jeopardy) {
			// TODO: set double, final jep
			setBoard(data.game?.jeopardy);
		}
	}, [data]);

	if (error !== undefined) {
		return <div>Error :(</div>;
	} else if (data?.error) {
		return <div>Error2: {data.message}</div>;
	}


	return (<BoardComponent board={board} />);
}