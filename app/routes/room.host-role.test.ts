import { RouterContextProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionType, CLUE_TIMEOUT_MS } from "~/engine";
import type { DbRoomEvent } from "~/models/room-event.server";

/* Routes of the host role (feature 22): the host seat, the host's judging
 * and flow control, and players' limits in host mode. */

const ANN = "ann";
const BOB = "bob";
const HOST = "host";
const VISITOR = "visitor";

const mocks = vi.hoisted(() => ({
  createRoomEventAsServer: vi.fn(),
  getAdmin: vi.fn(),
  getRoomEvents: vi.fn(),
  getRoom: vi.fn(),
  getGame: vi.fn(),
  /** Whose session sends the request. */
  session: { userId: "ann" },
}));

vi.mock("~/models/auth", () => ({ getValidAuthSession: async () => null }));
vi.mock("~/admin/auth.server", () => ({ getAdmin: mocks.getAdmin }));
vi.mock("~/models/room-event.server", () => ({
  createRoomEventAsServer: mocks.createRoomEventAsServer,
  getRoomEvents: mocks.getRoomEvents,
}));
vi.mock("~/models/room.server", () => ({ getRoom: mocks.getRoom }));
vi.mock("~/models/game.server", () => ({ getGame: mocks.getGame }));
vi.mock("~/models/solves.server", () => ({
  getSolve: vi.fn(),
  markAttempted: vi.fn(),
}));
vi.mock("~/session.server", () => ({
  getUserSession: async () => mocks.session.userId,
  requireSessionUserId: async (_request: Request, claimedUserId: string) => {
    if (claimedUserId !== mocks.session.userId) {
      throw new Response("userId does not match session", { status: 403 });
    }
  },
}));

import { getMockGame, MOCK_GAME } from "~/models/mock.server";

import { action as adminAction } from "./room.$roomId.admin";
import { action as checkAction } from "./room.$roomId.check";
import { action as hostAction } from "./room.$roomId.host";
import { action as nextAction } from "./room.$roomId.next-clue";
import { action as playerAction } from "./room.$roomId.player";
import { action as settingsAction } from "./room.$roomId.settings";
import { action as startAction } from "./room.$roomId.start";

const ROOM = { id: 7, name: "word", game_id: "mock" };

type Payloads = [ActionType, object][];

function toEvents(payloads: Payloads): DbRoomEvent[] {
  return payloads.map(([type, payload], k) => ({
    id: k + 1,
    room_id: ROOM.id,
    ts: `2026-11-01T10:00:${String(k + 1).padStart(2, "0")}`,
    type,
    payload: JSON.parse(JSON.stringify(payload)),
  }));
}

const LOBBY: Payloads = [
  [ActionType.Join, { userId: ANN, name: "Ann" }],
  [ActionType.Join, { userId: BOB, name: "Bob" }],
];
const HOSTED_LOBBY: Payloads = [
  ...LOBBY,
  [ActionType.ClaimHost, { userId: HOST, name: "Host" }],
];
const HOSTED_BOARD: Payloads = [
  ...HOSTED_LOBBY,
  [ActionType.StartRound, { round: 0, userId: HOST }],
];
/** Bob won the buzz on (0, 0) and answers out loud. */
const BOB_ANSWERING: Payloads = [
  ...HOSTED_BOARD,
  [ActionType.ChooseClue, { userId: ANN, i: 0, j: 0 }],
  [ActionType.Buzz, { userId: BOB, i: 0, j: 0, deltaMs: 100 }],
  [ActionType.Buzz, { userId: ANN, i: 0, j: 0, deltaMs: CLUE_TIMEOUT_MS + 1 }],
];

type Action = (args: {
  request: Request;
  url: URL;
  pattern: string;
  params: { roomId: string };
  context: RouterContextProvider;
}) => Promise<unknown>;

async function call(
  route: Action,
  path: string,
  fields: Record<string, string>,
  roomId = String(ROOM.id),
) {
  const request = new Request(`http://localhost/room/${roomId}/${path}`, {
    method: "POST",
    body: new URLSearchParams(fields),
  });
  return route({
    request,
    url: new URL(request.url),
    pattern: `/room/:roomId/${path}`,
    params: { roomId },
    context: new RouterContextProvider(),
  });
}

/** The status and message of a thrown Response or a data() result. */
async function outcome(promise: Promise<unknown>) {
  try {
    const result = await promise;
    if (result && typeof result === "object" && "init" in result) {
      const d: { data: { error: string }; init: { status: number } } =
        JSON.parse(JSON.stringify(result));
      return { status: d.init.status, error: d.data.error };
    }
    return { status: 200, result };
  } catch (error) {
    if (error instanceof Response) {
      return { status: error.status, error: await error.text() };
    }
    throw error;
  }
}

function inserted() {
  return mocks.createRoomEventAsServer.mock.calls.map(([, type, payload]) => [
    type,
    payload,
  ]);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.userId = ANN;
  mocks.getAdmin.mockResolvedValue(null);
  mocks.getRoom.mockResolvedValue(ROOM);
  mocks.getGame.mockResolvedValue(MOCK_GAME);
  mocks.getRoomEvents.mockResolvedValue(toEvents(LOBBY));
});

describe("host seat route", () => {
  const claim = (userId = VISITOR) =>
    call(hostAction, "host", { intent: "claim", userId, name: "Vic" });

  it("a visitor claims the free seat (service role)", async () => {
    mocks.session.userId = VISITOR;
    expect(await outcome(claim())).toMatchObject({ status: 200 });
    expect(inserted()).toEqual([
      [ActionType.ClaimHost, { userId: VISITOR, name: "Vic" }],
    ]);
  });

  it("403 when claiming the seat for someone else", async () => {
    mocks.session.userId = VISITOR;
    expect((await outcome(claim(BOB))).status).toBe(403);
    expect(inserted()).toEqual([]);
  });

  it("409: a player can't host, a taken seat, a question open", async () => {
    mocks.session.userId = ANN;
    expect(await outcome(claim(ANN))).toMatchObject({
      status: 409,
      error: "players can't host: leave the game first",
    });

    mocks.session.userId = VISITOR;
    mocks.getRoomEvents.mockResolvedValue(toEvents(HOSTED_LOBBY));
    expect(await outcome(claim())).toMatchObject({
      status: 409,
      error: "Host is already hosting",
    });

    mocks.getRoomEvents.mockResolvedValue(
      toEvents([
        ...LOBBY,
        [ActionType.StartRound, { round: 0, userId: ANN }],
        [ActionType.ChooseClue, { userId: ANN, i: 0, j: 0 }],
      ]),
    );
    expect((await outcome(claim())).status).toBe(409);
    expect(inserted()).toEqual([]);
  });

  it("the host frees the seat between questions; others get 403", async () => {
    mocks.getRoomEvents.mockResolvedValue(toEvents(HOSTED_BOARD));
    mocks.session.userId = ANN;
    expect(
      (
        await outcome(
          call(hostAction, "host", { intent: "release", userId: HOST }),
        )
      ).status,
    ).toBe(403);
    mocks.session.userId = HOST;
    expect(
      await outcome(
        call(hostAction, "host", { intent: "release", userId: HOST }),
      ),
    ).toMatchObject({ status: 200 });
    expect(inserted()).toEqual([[ActionType.ReleaseHost, { userId: HOST }]]);
  });

  it("409 when freeing the seat during a question", async () => {
    mocks.session.userId = HOST;
    mocks.getRoomEvents.mockResolvedValue(toEvents(BOB_ANSWERING));
    expect(
      (
        await outcome(
          call(hostAction, "host", { intent: "release", userId: HOST }),
        )
      ).status,
    ).toBe(409);
  });

  it("only the admin assigns the seat", async () => {
    mocks.session.userId = VISITOR;
    const assign = () =>
      call(hostAction, "host", {
        intent: "assign",
        userId: VISITOR,
        name: "Vic",
      });
    expect((await outcome(assign())).status).toBe(403);
    expect(inserted()).toEqual([]);

    mocks.getAdmin.mockResolvedValue({ id: "admin" });
    mocks.getRoomEvents.mockResolvedValue(toEvents(BOB_ANSWERING));
    // Replacing the host works during a question.
    expect(await outcome(assign())).toMatchObject({ status: 200 });
    expect(inserted()).toEqual([
      [ActionType.AssignHost, { userId: VISITOR, name: "Vic", admin: true }],
    ]);
  });

  it("the admin frees someone else's seat", async () => {
    mocks.getAdmin.mockResolvedValue({ id: "admin" });
    mocks.session.userId = VISITOR;
    mocks.getRoomEvents.mockResolvedValue(toEvents(HOSTED_BOARD));
    await call(hostAction, "host", { intent: "release", userId: HOST });
    expect(inserted()).toEqual([
      [ActionType.ReleaseHost, { userId: HOST, admin: true }],
    ]);
  });

  it("400 in solo play", async () => {
    expect(
      (
        await outcome(
          call(
            hostAction,
            "host",
            { intent: "claim", userId: ANN, name: "A" },
            "-1",
          ),
        )
      ).status,
    ).toBe(400);
  });
});

describe("judging in host mode", () => {
  beforeEach(() => {
    mocks.getRoomEvents.mockResolvedValue(toEvents(BOB_ANSWERING));
  });

  it("403 for a player marking their own answer", async () => {
    mocks.session.userId = BOB;
    const result = await outcome(
      call(checkAction, "check", {
        i: "0",
        j: "0",
        userId: BOB,
        result: "correct",
      }),
    );
    expect(result).toMatchObject({
      status: 403,
      error: "the host judges the answers in this room",
    });
    expect(inserted()).toEqual([]);
  });

  it("403 for a player's own timeout", async () => {
    mocks.session.userId = BOB;
    const result = await outcome(
      call(checkAction, "check", {
        i: "0",
        j: "0",
        userId: BOB,
        result: "incorrect",
        timedOut: "true",
      }),
    );
    expect(result.status).toBe(403);
  });

  it("403 for someone else judging as the host", async () => {
    mocks.session.userId = ANN;
    const result = await outcome(
      call(checkAction, "check", {
        i: "0",
        j: "0",
        userId: BOB,
        result: "correct",
        host: "true",
      }),
    );
    expect(result).toMatchObject({
      status: 403,
      error: "only the host can do this",
    });
  });

  it("the host judges; a right answer is revealed to everyone", async () => {
    mocks.session.userId = HOST;
    // After the insert the room's events include the verdict.
    mocks.getRoomEvents
      .mockResolvedValueOnce(toEvents(BOB_ANSWERING))
      .mockResolvedValueOnce(toEvents(BOB_ANSWERING))
      .mockResolvedValue(
        toEvents([
          ...BOB_ANSWERING,
          [
            ActionType.Check,
            { userId: BOB, i: 0, j: 0, correct: true, host: true },
          ],
        ]),
      );
    await call(checkAction, "check", {
      i: "0",
      j: "0",
      userId: BOB,
      result: "correct",
      host: "true",
    });
    expect(inserted()).toEqual([
      [
        ActionType.Check,
        { i: 0, j: 0, userId: BOB, correct: true, host: true },
      ],
      [ActionType.RevealAnswer, { round: 0, i: 0, j: 0, answer: "b" }],
    ]);
  });

  it("a wrong answer reveals nothing", async () => {
    mocks.session.userId = HOST;
    mocks.getRoomEvents
      .mockResolvedValueOnce(toEvents(BOB_ANSWERING))
      .mockResolvedValueOnce(toEvents(BOB_ANSWERING))
      .mockResolvedValue(
        toEvents([
          ...BOB_ANSWERING,
          [
            ActionType.Check,
            { userId: BOB, i: 0, j: 0, correct: false, host: true },
          ],
        ]),
      );
    await call(checkAction, "check", {
      i: "0",
      j: "0",
      userId: BOB,
      result: "incorrect",
      host: "true",
    });
    expect(inserted()).toEqual([
      [
        ActionType.Check,
        { i: 0, j: 0, userId: BOB, correct: false, host: true },
      ],
    ]);
  });

  it("a player still picks a multiple choice option, judged by the server", async () => {
    mocks.getGame.mockResolvedValue(await getMockGame("choice"));
    mocks.session.userId = BOB;
    await call(checkAction, "check", {
      i: "0",
      j: "0",
      userId: BOB,
      choice: "1",
      result: "incorrect",
    });
    expect(inserted()[0]).toEqual([
      ActionType.Check,
      { i: 0, j: 0, userId: BOB, correct: true, choice: 1 },
    ]);
  });
});

describe("flow control in host mode", () => {
  it("403 for a player starting the round; the host may", async () => {
    mocks.getRoomEvents.mockResolvedValue(toEvents(HOSTED_LOBBY));
    mocks.session.userId = ANN;
    expect(
      (await outcome(call(startAction, "start", { userId: ANN, round: "0" })))
        .status,
    ).toBe(403);
    mocks.session.userId = HOST;
    await call(startAction, "start", { userId: HOST, round: "0" });
    expect(inserted()).toEqual([
      [ActionType.StartRound, { round: 0, userId: HOST }],
    ]);
  });

  it("403 for a player moving on; the host may", async () => {
    const answered: Payloads = [
      ...BOB_ANSWERING,
      [
        ActionType.Check,
        { userId: BOB, i: 0, j: 0, correct: true, host: true },
      ],
    ];
    mocks.getRoomEvents.mockResolvedValue(toEvents(answered));
    mocks.session.userId = BOB;
    expect(
      (
        await outcome(
          call(nextAction, "next-clue", { userId: BOB, i: "0", j: "0" }),
        )
      ).status,
    ).toBe(403);
    mocks.session.userId = HOST;
    await call(nextAction, "next-clue", { userId: HOST, i: "0", j: "0" });
    expect(inserted()[0]).toEqual([
      ActionType.NextClue,
      { i: 0, j: 0, userId: HOST },
    ]);
  });

  it("rooms without a host are not replayed for it", async () => {
    mocks.getRoomEvents.mockResolvedValue(toEvents(LOBBY));
    await call(startAction, "start", { userId: ANN, round: "0" });
    expect(mocks.getGame).not.toHaveBeenCalled();
    expect(inserted()).toHaveLength(1);
  });
});

describe("host powers", () => {
  it("the host skips a question and changes scores (tagged host)", async () => {
    mocks.session.userId = HOST;
    mocks.getRoomEvents.mockResolvedValue(toEvents(BOB_ANSWERING));
    await call(adminAction, "admin", {
      intent: "score",
      userId: ANN,
      op: "add",
      amount: "300",
      host: "true",
    });
    await call(adminAction, "admin", {
      intent: "skip",
      i: "0",
      j: "0",
      host: "true",
    });
    expect(inserted().slice(0, 2)).toEqual([
      [ActionType.AdjustScore, { userId: ANN, delta: 300, host: true }],
      [ActionType.SkipClue, { i: 0, j: 0, host: true }],
    ]);
  });

  it("403 for someone else using the host's controls", async () => {
    mocks.session.userId = ANN;
    mocks.getRoomEvents.mockResolvedValue(toEvents(BOB_ANSWERING));
    expect(
      (
        await outcome(
          call(adminAction, "admin", {
            intent: "score",
            userId: ANN,
            op: "add",
            amount: "300",
            host: "true",
          }),
        )
      ).status,
    ).toBe(403);
  });

  it("the host changes the room timers between questions", async () => {
    mocks.session.userId = HOST;
    mocks.getRoomEvents.mockResolvedValue(toEvents(HOSTED_BOARD));
    await call(settingsAction, "settings", {
      userId: HOST,
      answerTimeSec: "10",
      autoWrongOnTimeout: "true",
      host: "true",
    });
    expect(inserted()[0]).toMatchObject([
      ActionType.SetSettings,
      { userId: HOST, answerTimeSec: 10, host: true },
    ]);

    mocks.session.userId = ANN;
    expect(
      (
        await outcome(
          call(settingsAction, "settings", {
            userId: ANN,
            answerTimeSec: "10",
            autoWrongOnTimeout: "true",
            host: "true",
          }),
        )
      ).status,
    ).toBe(403);
  });
});

describe("joining while hosting", () => {
  it("409: the host frees the seat first", async () => {
    mocks.session.userId = HOST;
    mocks.getRoomEvents.mockResolvedValue(toEvents(HOSTED_LOBBY));
    const result = await outcome(
      call(playerAction, "player", { userId: HOST, name: "Host" }),
    );
    expect(result).toMatchObject({
      status: 409,
      error: "you're hosting: stop hosting to play",
    });
    expect(inserted()).toEqual([]);
  });
});
