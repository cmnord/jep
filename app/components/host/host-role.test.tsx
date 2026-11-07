import * as ToastPrimitive from "@radix-ui/react-toast";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createRoutesStub } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import GameComponent from "~/components/game";
import {
  ANN,
  BOB,
  STEPS,
  WATCH_GAME,
} from "~/components/watch/fixtures.test-helpers";
import type { Action } from "~/engine";
import { ActionType, GameEngineContext, gameEngine } from "~/engine";
import { stateFromGame, type State } from "~/engine/state";
import { ConnectionState, stateToGameEngine } from "~/engine/use-game-engine";
import { I18nProvider, type Locale } from "~/i18n";
import type { Game } from "~/models/convert.server";
import { withholdAnswers } from "~/models/withhold-answers";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/* The host role (feature 22) on screen: the host sees the answer and
 * judges; players see who answers and never the answer before it is
 * revealed. */

const HOST = "host-user";
const VISITOR = "visitor";

type Step = { type: ActionType; payload?: unknown };

const at = (userId: string, i: number, j: number) => ({ userId, i, j });

const HOSTED: Step[] = [
  ...STEPS.join,
  { type: ActionType.ClaimHost, payload: { userId: HOST, name: "Vic" } },
  { type: ActionType.StartRound, payload: { round: 0, userId: HOST } },
];
/** Ann won the buzz on "This pet says meow" (answer: Cat). */
const ANN_ANSWERING: Step[] = [
  ...HOSTED,
  ...STEPS.chooseFirst,
  ...STEPS.buzzFirst,
];

function play(steps: Step[], game: Game = WATCH_GAME): State {
  let state = stateFromGame(game);
  steps.forEach((step, k) => {
    const action: Action = { ...step, ts: k + 1 };
    state = gameEngine(state, action);
  });
  return state;
}

let container: HTMLDivElement;
let root: Root;
let posted: [string, Record<string, FormDataEntryValue>][] = [];

beforeEach(() => {
  vi.useFakeTimers();
  posted = [];
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

/** Renders the room for `userId` the way the loader would send it: the
 * host gets the whole game, everyone else the game without the answers of
 * unresolved questions. */
function render(
  steps: Step[],
  userId: string,
  {
    locale = "en",
    watching = false,
  }: { locale?: Locale; watching?: boolean } = {},
) {
  const full = play(steps);
  const hidden = userId !== HOST && full.host !== null;
  const game = hidden ? withholdAnswers(WATCH_GAME, full) : WATCH_GAME;
  const state = hidden ? play(steps, game) : full;
  const engine = stateToGameEngine(game, state, () => null, {
    connectionState: ConnectionState.CONNECTED,
  });
  const Stub = createRoutesStub([
    {
      path: "/room/:roomName",
      Component: () => (
        <ToastPrimitive.Provider>
          <ToastPrimitive.Viewport />
          <I18nProvider locale={locale}>
            <GameEngineContext.Provider value={engine}>
              <GameComponent
                game={game}
                name="Visitor"
                roomId={7}
                roomName="7-apple"
                userId={userId}
                url="http://localhost:3000/room/7-apple"
                watching={watching}
                onWatchingChange={() => {}}
              />
            </GameEngineContext.Provider>
          </I18nProvider>
        </ToastPrimitive.Provider>
      ),
    },
    {
      path: "/room/:roomId/:verb",
      action: async ({ request }) => {
        posted.push([
          new URL(request.url).pathname,
          Object.fromEntries(await request.formData()),
        ]);
        return null;
      },
    },
  ]);
  act(() => root.render(<Stub initialEntries={["/room/7-apple"]} />));
  act(() => {
    vi.advanceTimersByTime(1_000);
  });
}

const query = (testId: string) =>
  document.body.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
const queryAll = (testId: string) =>
  Array.from(
    document.body.querySelectorAll<HTMLElement>(`[data-testid="${testId}"]`),
  );
const text = () => document.body.textContent ?? "";

function button(name: RegExp) {
  return Array.from(document.body.querySelectorAll("button")).find((b) =>
    name.test((b.getAttribute("aria-label") ?? b.textContent ?? "").trim()),
  );
}

async function click(el: HTMLElement | undefined | null) {
  expect(el).toBeTruthy();
  await act(async () => {
    el!.click();
    await vi.advanceTimersByTimeAsync(100);
  });
}

describe("host screen", () => {
  it("shows the answer and Right / Wrong for the answering player", async () => {
    render(ANN_ANSWERING, HOST);
    expect(query("host-prompt")).not.toBeNull();
    expect(query("host-answer")?.textContent).toContain("Cat");
    expect(query("host-answering")?.textContent).toBe("Ann is answering");
    await click(button(/^Right: Ann$/));
    expect(posted).toEqual([
      [
        "/room/7/check",
        { i: "0", j: "0", userId: ANN, result: "correct", host: "true" },
      ],
    ]);
  });

  it("marks a wrong answer for the player", async () => {
    render(ANN_ANSWERING, HOST);
    await click(button(/^Wrong: Ann$/));
    expect(posted[0][1]).toMatchObject({ userId: ANN, result: "incorrect" });
  });

  it("sees the answer while the question is read", () => {
    render([...HOSTED, ...STEPS.chooseFirst], HOST);
    expect(query("host-answer")?.textContent).toContain("Cat");
    expect(query("host-answering")).toBeNull();
  });

  it("judges each Final answer", async () => {
    const final: Step[] = [
      ...HOSTED,
      ...STEPS.chooseFirst,
      ...STEPS.buzzFirst,
      {
        type: ActionType.Check,
        payload: { ...at(ANN, 0, 0), correct: true, host: true },
      },
      { type: ActionType.NextClue, payload: at(HOST, 0, 0) },
      // Skip the rest of round 1 and give Bob points to wager.
      { type: ActionType.SkipClue, payload: { i: 1, j: 0, admin: true } },
      { type: ActionType.SkipClue, payload: { i: 0, j: 1, admin: true } },
      { type: ActionType.SkipClue, payload: { i: 1, j: 1, admin: true } },
      {
        type: ActionType.AdjustScore,
        payload: { userId: BOB, delta: 100, admin: true },
      },
      { type: ActionType.StartRound, payload: { round: 1, userId: HOST } },
      { type: ActionType.ChooseClue, payload: at(HOST, 0, 0) },
      ...STEPS.wagerAnnFinal,
      {
        type: ActionType.SetClueWager,
        payload: { ...at(BOB, 0, 0), wager: 50 },
      },
      ...STEPS.answerFinal,
    ];
    render(final, HOST);
    expect(query("host-answer")?.textContent).toContain("Paris");
    const rows = queryAll("host-final-answer").map((li) => li.textContent);
    expect(rows).toHaveLength(2);
    expect(rows.join(" ")).toContain("Paris");
    expect(rows.join(" ")).toContain("Rome");
    expect(text()).toContain("Judge each answer:");
    await click(button(/^Right: Ann$/));
    expect(posted[0]).toEqual([
      "/room/7/check",
      { i: "0", j: "0", userId: ANN, result: "correct", host: "true" },
    ]);

    // Players see only that the host is judging.
    act(() => root.unmount());
    root = createRoot(container);
    render(final, BOB);
    expect(query("host-judges")?.textContent).toBe(
      "The host is judging the answers.",
    );
    expect(button(/^Right$/)).toBeUndefined();
  });

  it("in Ukrainian", () => {
    render(ANN_ANSWERING, HOST, { locale: "uk" });
    expect(query("host-answering")?.textContent).toBe("Відповідає Ann");
    expect(button(/^Правильно: Ann$/)).toBeTruthy();
    expect(button(/^Неправильно: Ann$/)).toBeTruthy();
  });
});

describe("player screen in host mode", () => {
  it("never shows the answer or a self-check", () => {
    render(ANN_ANSWERING, BOB);
    expect(query("host-judges")?.textContent).toBe(
      "Ann is answering — the host will judge.",
    );
    expect(text()).not.toContain("Cat");
    expect(button(/Reveal answer/)).toBeUndefined();
    expect(query("host-prompt")).toBeNull();
  });

  it("tells the answering player to answer out loud", () => {
    render(ANN_ANSWERING, ANN);
    expect(query("host-judges")?.textContent).toBe(
      "Your turn: say your answer out loud. The host will judge.",
    );
    expect(text()).not.toContain("Cat");
    expect(button(/Reveal answer/)).toBeUndefined();
  });

  it("shows the answer once the server revealed it", () => {
    render(
      [
        ...ANN_ANSWERING,
        {
          type: ActionType.Check,
          payload: { ...at(ANN, 0, 0), correct: true, host: true },
        },
        {
          type: ActionType.RevealAnswer,
          payload: { round: 0, i: 0, j: 0, answer: "Cat" },
        },
      ],
      BOB,
    );
    expect(text()).toContain("Cat");
    // The host moves on, not the board-control player.
    expect(button(/Back to board/)).toBeUndefined();
  });

  it("in Ukrainian", () => {
    render(ANN_ANSWERING, BOB, { locale: "uk" });
    expect(query("host-judges")?.textContent).toBe(
      "Відповідає Ann — ведучий оцінить відповідь.",
    );
  });
});

describe("host seat", () => {
  it("a visitor can host the game from the join dialog", async () => {
    render(STEPS.join, VISITOR);
    await click(button(/Host this game/));
    expect(posted).toEqual([
      ["/room/7/host", { intent: "claim", userId: VISITOR, name: "Visitor" }],
    ]);
  });

  it("a taken seat is shown instead", () => {
    render(HOSTED.slice(0, 3), VISITOR);
    expect(button(/Host this game/)).toBeUndefined();
    expect(query("join-host-info")?.textContent).toContain(
      "Vic is hosting this game.",
    );
  });

  it("everyone sees who hosts; the host can stop between questions", async () => {
    render(HOSTED, ANN, { watching: true });
    expect(query("host-badge")?.textContent).toContain("Host: Vic");
    expect(button(/Stop hosting/)).toBeUndefined();

    act(() => root.unmount());
    root = createRoot(container);
    render(HOSTED, HOST);
    expect(query("host-badge")?.textContent).toContain("You're the host");
    await click(button(/Stop hosting/));
    expect(posted).toEqual([
      ["/room/7/host", { intent: "release", userId: HOST }],
    ]);
  });

  it("only the host starts the round", () => {
    render(HOSTED.slice(0, 3), ANN);
    expect(button(/^Start round$/)).toBeUndefined();
    expect(query("preview-host")?.textContent).toContain("Host: Vic");

    act(() => root.unmount());
    root = createRoot(container);
    render(HOSTED.slice(0, 3), HOST);
    expect(button(/^Start round$/)).toBeTruthy();
  });

  it("in Ukrainian", () => {
    render(STEPS.join, VISITOR, { locale: "uk" });
    expect(button(/Вести гру/)).toBeTruthy();
  });
});
