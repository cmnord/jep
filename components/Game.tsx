import useSWR from "swr";
import React, { useEffect, useState } from "react";
import { GameResponse, Game } from "../pages/api/gameResponse";
import BoardComponent, { ClueState, BoardState, NUM_CATEGORIES, NUM_CLUES_PER_CATEGORY, Round } from "./Board";
import Prompt from "./Prompt";
import Preview, { SinglePreview, DoublePreview } from "./Preview";

interface Props {
	year: number;
	month: number;
	day: number;
}

type GameState = {
	[Round.Single]: BoardState;
	[Round.Double]: BoardState;
	[Round.Final]: ClueState;
}


const TOTAL_NUM_CLUES = NUM_CATEGORIES * NUM_CLUES_PER_CATEGORY;
/** FINAL_CLUE_IDX is a sentinel value to show the final clue index. */
const FINAL_CLUE_IDX = { i: -1, j: -1 };

const emptyGameState: GameState = {
	[Round.Single]: new BoardState(),
	[Round.Double]: new BoardState(),
	[Round.Final]: new ClueState(),
}

/** Game maintains the game state. */
export default function GameComponent(props: Props) {
	const [game, setGame] = useState<Game>();

	const [gameState, setGameState] = useState<GameState>(emptyGameState);
	const [clueIdx, setClueIdx] = useState<{ i: number, j: number }>();

	const [round, setRound] = useState(Round.Single);
	const [cluesAnswered, setCluesAnswered] = useState(0);

	const [showPreview, setShowPreview] = useState(true);

	const { data, error } = useSWR<GameResponse>(`/api/mockGameResponse?year=${props.year}&month=${props.month}&day=${props.day}`,
		(input, init) => fetch(input, init).then((res) => res.json()));

	// Set the game when the data arrives
	useEffect(() => {
		if (data && !data.error && data.game) {
			setGame(data.game);
		}
	}, [data]);

	const getActiveClue = (idx?: { i: number, j: number }) => {
		if (!idx) {
			return;
		}
		const board = boardForGame(game);
		if (board) {
			return board.categories[idx.i].clues[idx.j];
		}
		return game?.final;
	}

	const boardForGame = (g: Game | undefined) => {
		switch (round) {
			case Round.Single:
				return g?.single;
			case Round.Double:
				return g?.double;
			case Round.Final:
				return;
		}
	}

	const boardStateForGameState = (g: GameState) => {
		switch (round) {
			case Round.Single:
				return g[Round.Single];
			case Round.Double:
				return g[Round.Double];
			case Round.Final:
				return;
		}
	}

	const handleClickClue = (i: number, j: number) => {
		const boardState = boardStateForGameState(gameState);
		if (!boardState || boardState.get(i, j)?.isAnswered) {
			return;
		}
		// not yet answered
		setGameState(oldState => {
			boardState.get(i, j).isActive = true;
			return oldState;
		});
		setClueIdx({ i, j });
	}

	if (error !== undefined) {
		return <div>Error :(</div>;
	} else if (data?.error) {
		return <div>Error: {data.message}</div>;
	}

	const handleClickPrompt = (idx?: { i: number, j: number }) => {
		if (round !== Round.Single && round !== Round.Double && round !== Round.Final) {
			return;
		}
		setGameState(oldState => {
			if (round === Round.Final) {
				oldState[round].isAnswered = true;
				oldState[round].isActive = false;
			} else if (idx) {
				oldState[round].get(idx.i, idx.j).isAnswered = true;
				oldState[round].get(idx.i, idx.j).isActive = false;
			}
			return oldState;
		});
		const newCluesAnswered = cluesAnswered + 1;
		if (newCluesAnswered === TOTAL_NUM_CLUES) {
			setRound(Round.Double);
			setShowPreview(true);
		} else if (newCluesAnswered === TOTAL_NUM_CLUES * 2) {
			setRound(Round.Final);
			setShowPreview(true);
		} else if (newCluesAnswered === TOTAL_NUM_CLUES * 2 + 1) {
			setRound(Round.End);
			setShowPreview(true);
		}
		setCluesAnswered(newCluesAnswered);
		setClueIdx(undefined);
	}

	const handleDismissPreview = () => {
		setShowPreview(false);
	}

	const handleDismissFinalPreview = () => {
		setClueIdx(FINAL_CLUE_IDX);
		setShowPreview(false);
	}

	const renderPreview = () => {
		switch (round) {
			case Round.Single:
				return <SinglePreview year={props.year} month={props.month} day={props.day} onClick={handleDismissPreview} />
			case Round.Double:
				return <DoublePreview onClick={handleDismissPreview} />;
			case Round.Final:
				return <Preview onClick={handleDismissFinalPreview}>final preview</Preview>;
			case Round.End:
				return <Preview onClick={() => 1}>game summary</Preview>;
		}
	}

	return (<>
		{showPreview ? renderPreview() : null}
		<Prompt clue={getActiveClue(clueIdx)} onClick={() => handleClickPrompt(clueIdx)} />
		<BoardComponent board={boardForGame(game)} boardState={boardStateForGameState(gameState)} onClickClue={handleClickClue} round={round} />
	</>);
}