import { describe, expect, it } from "vitest";

import { GameState, type Player, stateFromGame } from "~/engine/state";
import { MOCK_GAME } from "~/models/mock.server";

import { deserializeState, serializeState } from "./offline-storage";

describe("serializeState / deserializeState", () => {
  it("round-trips initial empty state", () => {
    const state = stateFromGame(MOCK_GAME);
    const serialized = serializeState(state);
    const result = deserializeState(serialized, MOCK_GAME);

    expect(result.type).toBe(GameState.PreviewRound);
    expect(result.round).toBe(0);
    expect(result.numAnswered).toBe(0);
    expect(result.players.size).toBe(0);
    expect(result.answers.size).toBe(0);
    expect(result.wagers.size).toBe(0);
    expect(result.buzzes.size).toBe(0);
    expect(result.activeClue).toBeNull();
    expect(result.game).toBe(MOCK_GAME);
  });

  it("round-trips state with players, answers, wagers, and buzzes", () => {
    const state = stateFromGame(MOCK_GAME);

    const player: Player = { userId: "user1", name: "🎮", score: 1000 };
    state.players.set("user1", player);
    state.answers.set("0,0,0", new Map([["user1", "What is b?"]]));
    state.wagers.set("0,0,0", new Map([["user1", 500]]));
    state.buzzes.set("user1", 12345);

    const result = deserializeState(serializeState(state), MOCK_GAME);

    expect(result.players.get("user1")).toEqual(player);
    expect(result.answers.get("0,0,0")?.get("user1")).toBe("What is b?");
    expect(result.wagers.get("0,0,0")?.get("user1")).toBe(500);
    expect(result.buzzes.get("user1")).toBe(12345);
  });

  it("preserves nested Maps with multiple entries", () => {
    const state = stateFromGame(MOCK_GAME);
    state.answers.set(
      "0,0,0",
      new Map([
        ["user1", "answer A"],
        ["user2", "answer B"],
      ]),
    );
    state.answers.set("0,0,1", new Map([["user1", "answer C"]]));

    const result = deserializeState(serializeState(state), MOCK_GAME);

    expect(result.answers.size).toBe(2);
    expect(result.answers.get("0,0,0")?.size).toBe(2);
    expect(result.answers.get("0,0,0")?.get("user2")).toBe("answer B");
    expect(result.answers.get("0,0,1")?.get("user1")).toBe("answer C");
  });

  it("preserves ClueAnswer.answeredBy Map", () => {
    const state = stateFromGame(MOCK_GAME);
    state.isAnswered[0][0][0] = {
      isAnswered: true,
      answeredBy: new Map([
        ["user1", true],
        ["user2", false],
      ]),
      answerOrder: 1,
    };

    const result = deserializeState(serializeState(state), MOCK_GAME);

    const cell = result.isAnswered[0][0][0];
    expect(cell.isAnswered).toBe(true);
    expect(cell.answerOrder).toBe(1);
    expect(cell.answeredBy).toBeInstanceOf(Map);
    expect(cell.answeredBy.get("user1")).toBe(true);
    expect(cell.answeredBy.get("user2")).toBe(false);
  });

  it("resets clock state on deserialization", () => {
    const state = stateFromGame(MOCK_GAME);
    Object.assign(state, {
      clockRunning: true,
      clockAccumulatedMs: 5000,
      clockLastResumedAt: Date.now(),
    });

    const serialized = serializeState(state);
    expect(serialized.clockRunning).toBe(true);

    const result = deserializeState(serialized, MOCK_GAME);
    expect(result.clockRunning).toBe(false);
    expect(result.clockLastResumedAt).toBeNull();
    expect(result.clockAccumulatedMs).toBe(5000);
  });

  it("preserves activeClue tuple", () => {
    const state = stateFromGame(MOCK_GAME);
    Object.assign(state, { activeClue: [1, 0] });

    const result = deserializeState(serializeState(state), MOCK_GAME);
    expect(result.activeClue).toEqual([1, 0]);
  });

  it("uses game parameter for game reference", () => {
    const state = stateFromGame(MOCK_GAME);
    const otherGame = { ...MOCK_GAME, title: "Other" };

    const serialized = serializeState(state);
    const result = deserializeState(serialized, otherGame);

    expect(result.game).toBe(otherGame);
    expect(result.game.title).toBe("Other");
  });
});
