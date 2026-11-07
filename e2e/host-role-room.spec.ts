import path from "node:path";

import type { Browser, Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import {
  clickStartRound,
  goto,
  openClue,
  uploadGame,
  waitForBoardReady,
  stubExternalMedia,
  waitForConnected,
} from "./helpers";

/* The host role (feature 22): a visitor hosts, two players answer out loud
 * and the host judges. Players never get the answer of an open question —
 * not on screen, not in the room's data. */

const MOCK_3x3_PATH = path.resolve("app/static/mock-3x3.jep.json");
const MEDIA_PATH = path.resolve("app/static/mock-media.jep.json");

declare global {
  interface Window {
    /** How many times media playback started (the replay test). */
    plays?: number;
  }
}

async function newPage(browser: Browser) {
  const context = await browser.newContext();
  return context.newPage();
}

async function join(page: Page) {
  await waitForConnected(page);
  await page.getByRole("button", { name: /join game/i }).click();
  await expect(page.getByRole("button", { name: /join game/i })).toBeHidden({
    timeout: 10_000,
  });
}

/** `page` buzzes in on the open question until it is their turn to answer
 * out loud (the other player's device sends its "no buzz" after the buzz
 * window). */
async function buzzIn(page: Page) {
  await expect(async () => {
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("host-judges")).toHaveText(
      "Your turn: say your answer out loud. The host will judge.",
      { timeout: 1_000 },
    );
  }).toPass({ timeout: 20_000 });
}

/** The room's loader data as `page`'s visitor gets it (React Router's
 * single-fetch data request, with the visitor's cookies). */
async function roomData(page: Page, roomUrl: string) {
  const res = await page.request.get(`${roomUrl}.data`);
  expect(res.ok()).toBe(true);
  return res.text();
}

test.describe("host role", () => {
  test("the host judges spoken answers; players never see the answer early", async ({
    authedPage: uploader,
    browser,
  }) => {
    test.setTimeout(180_000);
    await goto(uploader, "/profile");
    const gameId = await uploadGame(uploader, MOCK_3x3_PATH);
    await goto(uploader, `/game/${gameId}/play`);
    await expect(uploader).toHaveURL(/\/room\/\d+-\w+$/);
    const roomUrl = uploader.url();

    // The host takes the free seat from the join dialog.
    const host = await newPage(browser);
    await goto(host, roomUrl);
    await waitForConnected(host);
    await host.getByRole("button", { name: /Host this game/ }).click();
    await expect(host.getByTestId("host-badge")).toContainText(
      "You're the host",
      { timeout: 10_000 },
    );

    const ann = await newPage(browser);
    await goto(ann, roomUrl);
    await expect(ann.getByTestId("join-host-info")).toContainText(
      "is hosting this game.",
    );
    await join(ann);
    const bob = await newPage(browser);
    await goto(bob, roomUrl);
    await join(bob);
    await expect(bob.getByTestId("host-badge")).toContainText("Host:");

    // Only the host starts the round.
    await expect(ann.getByText("The host starts the round.")).toBeVisible();
    await clickStartRound(host);
    await waitForBoardReady(ann);

    // Ann (board control) opens Cat A $200 (answer: a1-answer).
    await openClue(ann, ann.getByRole("button", { name: "$ 200" }).first());
    await expect(host.getByTestId("host-answer")).toContainText("a1-answer", {
      timeout: 10_000,
    });

    // The players' data has no answer for the open question; the host's has.
    expect(await roomData(bob, roomUrl)).not.toContain("a1-answer");
    expect(await roomData(ann, roomUrl)).not.toContain("b1-answer");
    expect(await roomData(host, roomUrl)).toContain("a1-answer");

    // Ann buzzes in and answers out loud; the host marks her wrong.
    await buzzIn(ann);
    await expect(bob.getByTestId("host-judges")).toHaveText(
      /is answering — the host will judge\./,
    );
    await expect(host.getByTestId("host-answering")).toContainText(
      "is answering",
    );
    await host.getByRole("button", { name: /^Wrong: / }).click();

    // Bob doesn't see the answer and can buzz in.
    await buzzIn(bob);
    await expect(bob.locator("body")).not.toContainText("a1-answer");
    await expect(ann.locator("body")).not.toContainText("a1-answer");
    expect(await roomData(bob, roomUrl)).not.toContain("a1-answer");

    // The host marks Bob right: the answer is shown to everyone.
    await host.getByRole("button", { name: /^Right: / }).click();
    for (const page of [ann, bob]) {
      await expect(page.getByText("a1-answer").first()).toBeVisible({
        timeout: 10_000,
      });
    }
    await expect(bob.getByText("$200").first()).toBeVisible();

    // The host moves on (the board-control player has no button) and frees
    // the seat: the room plays the self-marking game again.
    await expect(
      bob.getByRole("button", { name: /back to board/i }),
    ).toHaveCount(0);
    // (The host's "Back to board" also goes on by itself after 3 s.)
    const stop = host.getByRole("button", { name: "Stop hosting" });
    await expect(async () => {
      const back = host.getByRole("button", { name: /back to board/i });
      if (await back.isVisible()) await back.click({ timeout: 1_000 });
      await expect(stop).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await waitForBoardReady(bob);
    await stop.click();
    await expect(bob.getByTestId("host-badge")).toHaveCount(0, {
      timeout: 10_000,
    });

    // Bob (board control) opens a question; now players reveal and mark
    // their own answers.
    // (Cat A's $200 was played: Cat B's is the second.)
    await openClue(bob, bob.getByRole("button", { name: "$ 200" }).nth(1));
    await expect(async () => {
      await bob.keyboard.press("Enter");
      await expect(
        bob.getByRole("button", { name: /reveal answer/i }),
      ).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
    await expect(bob.getByText("b1-answer").first()).toBeAttached();
  });

  test("the host replays a question's audio on every device", async ({
    authedPage: uploader,
    browser,
  }) => {
    test.setTimeout(120_000);
    await goto(uploader, "/profile");
    const gameId = await uploadGame(uploader, MEDIA_PATH);
    await goto(uploader, `/game/${gameId}/play`);
    await expect(uploader).toHaveURL(/\/room\/\d+-\w+$/);
    const roomUrl = uploader.url();

    const host = await newPage(browser);
    await stubExternalMedia(host);
    await goto(host, roomUrl);
    await waitForConnected(host);
    await host.getByRole("button", { name: /Host this game/ }).click();
    await expect(host.getByTestId("host-badge")).toContainText(
      "You're the host",
      { timeout: 10_000 },
    );

    // Count every start of playback on Ann's device.
    const ann = await newPage(browser);
    await stubExternalMedia(ann);
    await ann.addInitScript(() => {
      window.plays = 0;
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        window.plays = (window.plays ?? 0) + 1;
        return play.call(this).catch(() => undefined);
      };
    });
    await goto(ann, roomUrl);
    await join(ann);
    await clickStartRound(host);

    // "Music & Film" $200 is an audio question.
    await openClue(ann, ann.getByRole("button", { name: "$ 200" }).nth(1));
    const replay = host.getByTestId("host-replay-media");
    await expect(replay).toBeVisible({ timeout: 10_000 });
    await expect(ann.getByTestId("host-replay-media")).toHaveCount(0);

    // Once Ann answers (no more autoplay), the host replays the clip.
    await buzzIn(ann);
    const plays = () => ann.evaluate(() => window.plays ?? 0);
    const before = await plays();
    await replay.click();
    await expect.poll(plays, { timeout: 10_000 }).toBeGreaterThan(before);
    await expect
      .poll(() =>
        ann.evaluate(() => document.querySelector("audio")?.currentTime ?? -1),
      )
      .toBeLessThan(1);
  });
});
