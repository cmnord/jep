import useSWR from "swr";
import React, { useEffect, useState } from "react";
import { GameResponse, Board, Round, Category, Clue } from "../pages/api/gameResponse";
import BoardComponent from "./Board";
import Prompt from "./Prompt";

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
	const [currentClue, setCurrentClue] = useState<Clue>();
	const [step, setStep] = useState(1);

	const { data, error } = useSWR<GameResponse>(`/api/mockGameResponse?year=${props.year}&month=${props.month}&day=${props.day}`,
		(input, init) => fetch(input, init).then((res) => res.json()));

	useEffect(() => {
		if (data && !data.error && data.game?.jeopardy) {
			// TODO: set double, final jep
			setBoard(data.game?.jeopardy);
		}
	}, [data]);

	const handleClickClue = (categoryIdx: number, clueIdx: number) => {
		const clue = board.categories[categoryIdx].clues[clueIdx];
		// not yet answered
		if (clue.order === 0) {
			setBoard(prevBoard => {
				prevBoard.categories[categoryIdx].clues[clueIdx].order = step;
				return prevBoard;
			});
			setCurrentClue(clue);
		}
	}

	if (error !== undefined) {
		return <div>Error :(</div>;
	} else if (data?.error) {
		return <div>Error2: {data.message}</div>;
	}

	const handleClickPrompt = () => {
		setCurrentClue(undefined);
		setStep(step => step + 1);
	}

	return (<>
		<Prompt clue={currentClue} onClick={() => handleClickPrompt()} />
		<BoardComponent board={board} onClickClue={handleClickClue} step={step} />
	</>);
}