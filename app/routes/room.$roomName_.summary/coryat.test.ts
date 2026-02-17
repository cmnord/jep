import { Player, stateFromGame } from "~/engine/state";
import { MOCK_GAME } from "~/models/mock.server";

import { getCoryat } from "./coryat";

describe("getCoryat", () => {
  const alice: Player = {
    userId: "Alice",
    name: "Alice",
    score: 1000,
  };

  const bob: Player = {
    userId: "Bob",
    name: "Bob",
    score: 400,
  };

  const carol: Player = {
    userId: "Carol",
    name: "Carol",
    score: -100,
  };

  const state = stateFromGame(MOCK_GAME);
  state.players.set(alice.userId, alice);
  state.players.set(bob.userId, bob);
  state.players.set(carol.userId, carol);

  // Alice wagered 1000 on the first clue, Carol wagered 100
  state.wagers.set(
    "0,0,0",
    new Map([
      [alice.userId, 1000],
      [carol.userId, 100],
    ]),
  );
  // Alice answered the wager correctly, Carol answered incorrectly (forced
  // incorrect)
  state.isAnswered[0][0][0] = {
    isAnswered: true,
    answeredBy: new Map([
      [alice.userId, true],
      [carol.userId, false],
    ]),
  };

  interface TestCase {
    name: string;
    userId: string;
    expected: number;
  }

  const testCases: TestCase[] = [
    {
      name: "remove Alice's correct wager, add natural clue value",
      userId: alice.userId,
      expected: 200,
    },
    {
      name: "Bob did not wager on any clues",
      userId: bob.userId,
      expected: 400,
    },
    {
      name: "remove Carol's incorrect wager, but do not subtract natural clue value",
      userId: carol.userId,
      expected: 0,
    },
    {
      name: "0 for unknown user",
      userId: "unknown",
      expected: 0,
    },
  ];

  for (const tc of testCases) {
    it(tc.name, () => {
      expect(getCoryat(tc.userId, state)).toEqual(tc.expected);
    });
  }
});
