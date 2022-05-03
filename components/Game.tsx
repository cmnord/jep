import useSWR from "swr";
import React, { useEffect, useState } from "react";
import { GameResponse, Board, Clue, Game } from "../pages/api/gameResponse";
import BoardComponent, { NUM_CATEGORIES, NUM_CLUES_PER_CATEGORY, Round } from "./Board";
import Prompt from "./Prompt";

interface Props {
	year: number;
	month: number;
	day: number;
}

const END_JEOPARDY_STEP = NUM_CATEGORIES * NUM_CLUES_PER_CATEGORY + 1;
const END_DOUBLE_JEOPARDY_STEP = NUM_CATEGORIES * NUM_CLUES_PER_CATEGORY * 2 + 1;

/** Game maintains the game state. */
export default function GameComponent(props: Props) {
	const [game, setGame] = useState<Game>();
	const [currentClue, setCurrentClue] = useState<Clue>();
	const [step, setStep] = useState(1);

	const { data, error } = useSWR<GameResponse>(`/api/mockGameResponse?year=${props.year}&month=${props.month}&day=${props.day}`,
		(input, init) => fetch(input, init).then((res) => res.json()));

	// Set the game when the data arrives
	useEffect(() => {
		if (data && !data.error && data.game) {
			setGame(data.game);
		}
	}, [data]);

	const roundForStep = (s: number) => {
		if (s < END_JEOPARDY_STEP) {
			return Round.Jeopardy;
		} else if (s < END_DOUBLE_JEOPARDY_STEP) {
			return Round.DoubleJeopardy;
		}
		return Round.FinalJeopardy;
	}

	const boardForStep = (g: Game | undefined) => {
		const round = roundForStep(step);
		return round === Round.Jeopardy ? g?.jeopardy : g?.doubleJeopardy;
		// TODO: g?.finalJeopardy;
	}

	const handleClickClue = (categoryIdx: number, clueIdx: number) => {
		const board = boardForStep(game)
		const clue = board?.categories[categoryIdx].clues[clueIdx];
		// not yet answered
		if (clue?.order === 0) {
			setGame(prevGame => {
				const prevBoard = boardForStep(prevGame);
				if (prevBoard) {
					prevBoard.categories[categoryIdx].clues[clueIdx].order = step;
				}
				return prevGame;
			});
			setCurrentClue(clue);
		}
	}

	if (error !== undefined) {
		return <div>Error :(</div>;
	} else if (data?.error) {
		return <div>Error: {data.message}</div>;
	}

	const handleClickPrompt = () => {
		setCurrentClue(undefined);
		setStep(step => step + 1);
	}

	return (<>
		<Prompt clue={currentClue} onClick={() => handleClickPrompt()} />
		<BoardComponent board={boardForStep(game)} onClickClue={handleClickClue} step={step} round={roundForStep(step)} />
	</>);
}