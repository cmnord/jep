import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getMockGame } from "~/models/mock.server";

import { BoardComponent } from "./board";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function renderBoard(busy: boolean) {
  const game = await getMockGame();
  act(() =>
    root.render(
      <BoardComponent
        board={game.boards[0]}
        busy={busy}
        hasBoardControl
        isAnswered={() => false}
        isCategoryRevealed={() => true}
        isClueRevealed={() => true}
        onClickClue={() => null}
        onFocusClue={() => null}
        onKeyDownClue={() => null}
        tbodyRef={React.createRef()}
      />,
    ),
  );
}

describe("BoardComponent", () => {
  it("marks the board busy while it isn't ready to play", async () => {
    await renderBoard(true);
    expect(container.querySelector("table")?.getAttribute("aria-busy")).toBe(
      "true",
    );

    await renderBoard(false);
    expect(container.querySelector("table")?.getAttribute("aria-busy")).toBe(
      "false",
    );
  });
});
