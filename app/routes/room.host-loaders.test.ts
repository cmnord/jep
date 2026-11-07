// @vitest-environment node
import { RouterContextProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionType, CLUE_TIMEOUT_MS } from "~/engine";
import type { DbRoomEvent } from "~/models/room-event.server";

/* Host mode (feature 22): the room and TV loaders withhold the answers of
 * unresolved questions from everyone but the host and the site admin. */

const ANN = "ann";
const BOB = "bob";
const HOST = "host";

const mocks = vi.hoisted(() => ({
  createRoomEventAsServer: vi.fn(),
  getAdmin: vi.fn(),
  getRoomEvents: vi.fn(),
  getRoomByName: vi.fn(),
  getGame: vi.fn(),
  visitor: "ann",
}));

vi.mock("varlock/env", () => ({ ENV: { BASE_URL: "https://jep.test" } }));
vi.mock("~/models/auth", () => ({ getValidAuthSession: async () => null }));
vi.mock("~/admin/auth.server", () => ({ getAdmin: mocks.getAdmin }));
vi.mock("~/models/room-event.server", () => ({
  createRoomEventAsServer: mocks.createRoomEventAsServer,
  getRoomEvents: mocks.getRoomEvents,
}));
vi.mock("~/models/room.server", () => ({
  getRoomByName: mocks.getRoomByName,
}));
vi.mock("~/models/game.server", () => ({ getGame: mocks.getGame }));
vi.mock("~/models/user", () => ({ getUserByEmail: vi.fn() }));
vi.mock("~/session.server", () => ({
  getUserSession: async () => mocks.visitor,
  getOrCreateUserSession: async () => mocks.visitor,
}));

import { MOCK_GAME } from "~/models/mock.server";

import { loader as roomLoader } from "./room.$roomName";
import { loader as tvLoader } from "./room.$roomName_.present";

const ROOM = { id: 9, name: "word", game_id: "mock" };

function toEvents(payloads: [ActionType, object][]): DbRoomEvent[] {
  return payloads.map(([type, payload], k) => ({
    id: k + 1,
    room_id: ROOM.id,
    ts: `2026-11-01T10:00:${String(k + 1).padStart(2, "0")}`,
    type,
    payload: JSON.parse(JSON.stringify(payload)),
  }));
}

/** (0, 0) was answered right; (0, 1) and round 2 are unplayed. */
const AFTER_ONE: [ActionType, object][] = [
  [ActionType.Join, { userId: ANN, name: "Ann" }],
  [ActionType.Join, { userId: BOB, name: "Bob" }],
  [ActionType.ClaimHost, { userId: HOST, name: "Host" }],
  [ActionType.StartRound, { round: 0, userId: HOST }],
  [ActionType.ChooseClue, { userId: ANN, i: 0, j: 0 }],
  [ActionType.Buzz, { userId: BOB, i: 0, j: 0, deltaMs: 100 }],
  [ActionType.Buzz, { userId: ANN, i: 0, j: 0, deltaMs: CLUE_TIMEOUT_MS + 1 }],
  [ActionType.Check, { userId: BOB, i: 0, j: 0, correct: true, host: true }],
  [ActionType.RevealAnswer, { round: 0, i: 0, j: 0, answer: "b" }],
  [ActionType.NextClue, { userId: HOST, i: 0, j: 0 }],
];

function args(path: string) {
  const request = new Request(`http://localhost${path}`);
  return {
    request,
    url: new URL(request.url),
    pattern: path,
    params: { roomName: ROOM.name },
    context: new RouterContextProvider(),
  };
}

type LoaderGame = {
  answersHidden: boolean;
  game: typeof MOCK_GAME;
};

async function loadRoom(): Promise<LoaderGame> {
  const result = await roomLoader(args(`/room/${ROOM.name}`));
  // Visitors without an account get data() with the session cookie.
  const loaded: LoaderGame = JSON.parse(
    JSON.stringify("data" in result ? result.data : result),
  );
  return loaded;
}

const answers = (game: typeof MOCK_GAME) =>
  game.boards.flatMap((b) =>
    b.categories.flatMap((c) => c.clues.map((clue) => clue.answer)),
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.visitor = ANN;
  mocks.getAdmin.mockResolvedValue(null);
  mocks.getRoomByName.mockResolvedValue(ROOM);
  mocks.getGame.mockResolvedValue(MOCK_GAME);
  mocks.getRoomEvents.mockResolvedValue(toEvents(AFTER_ONE));
});

describe("room loader in host mode", () => {
  it("a player gets no answers of unresolved questions", async () => {
    const data = await loadRoom();
    expect(data.answersHidden).toBe(true);
    // (0, 0) was resolved: its answer is included.
    expect(answers(data.game)).toEqual(["b", "", "", ""]);
    expect(JSON.stringify(data.game)).not.toMatch(/"answer":"[dfh]"/);
  });

  it("a spectator gets none either", async () => {
    mocks.visitor = "someone";
    expect(answers((await loadRoom()).game)).toEqual(["b", "", "", ""]);
  });

  it("the host and the admin get everything", async () => {
    mocks.visitor = HOST;
    let data = await loadRoom();
    expect(data.answersHidden).toBe(false);
    expect(answers(data.game)).toEqual(["b", "d", "f", "h"]);

    mocks.visitor = ANN;
    mocks.getAdmin.mockResolvedValue({ id: "admin" });
    data = await loadRoom();
    expect(answers(data.game)).toEqual(["b", "d", "f", "h"]);
  });

  it("nothing is withheld without a host", async () => {
    mocks.getRoomEvents.mockResolvedValue(
      toEvents(AFTER_ONE.filter(([type]) => type !== ActionType.ClaimHost)),
    );
    const data = await loadRoom();
    expect(data.answersHidden).toBe(false);
    expect(answers(data.game)).toEqual(["b", "d", "f", "h"]);
  });

  it("inserts a missing reveal of a resolved question", async () => {
    const resolved = AFTER_ONE.slice(0, 8);
    mocks.getRoomEvents
      .mockResolvedValueOnce(toEvents(resolved))
      .mockResolvedValue(toEvents(AFTER_ONE.slice(0, 9)));
    await loadRoom();
    expect(mocks.createRoomEventAsServer).toHaveBeenCalledWith(
      ROOM.id,
      ActionType.RevealAnswer,
      { round: 0, i: 0, j: 0, answer: "b" },
    );
  });
});

describe("TV loader in host mode", () => {
  it("never gets the answers of unresolved questions", async () => {
    mocks.getAdmin.mockResolvedValue({ id: "admin" });
    const data = await tvLoader(args(`/room/${ROOM.name}/present`));
    expect(data.answersHidden).toBe(true);
    expect(answers(data.game)).toEqual(["b", "", "", ""]);
  });
});
