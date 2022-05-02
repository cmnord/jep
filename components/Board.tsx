import { Board, Category } from "../pages/api/gameResponse";

interface Props {
	board: Board;
}

/** BoardComponent is purely presentational and renders the board. */
export default function BoardComponent(props: Props) {
	const renderCategory = (category: Category, i: number) => {
		return <div>category {i}: {category.name}</div>;
	}
	return (<div>{props.board.categories.map(renderCategory)}</div>);
}