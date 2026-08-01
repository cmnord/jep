import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/** Optional directory for step-by-step screenshots (set UNDO_SHOTS_DIR). */
const shotsDir = process.env.UNDO_SHOTS_DIR;
let shotIndex = 0;

async function shot(page: Page, name: string) {
  if (!shotsDir) return;
  shotIndex += 1;
  await page.screenshot({
    path: `${shotsDir}/${String(shotIndex).padStart(2, "0")}-${name}.png`,
  });
}

/** Plays the first $200 clue of the mock game and self-checks "correct!". */
async function playClueAndCheckCorrect(page: Page) {
  await page.goto("/mock");

  await page.getByRole("button", { name: /join game/i }).click();
  await page.getByRole("button", { name: /start round/i }).click();

  await playNextClueCorrect(page);
}

/** Plays the next playable $200 clue from the board and self-checks
 * "correct!", ending on the reveal screen. */
async function playNextClueCorrect(page: Page) {
  // Skip already-answered cells (they become popover triggers) and retry
  // clicking until the board fill animation lets the clue prompt open.
  const clueButton = page
    .getByRole("button", { name: "$ 200" })
    .and(page.locator(":not([aria-haspopup])"))
    .first();
  await expect(async () => {
    await clueButton.click({ timeout: 2_000 });
    await expect(page.getByText(/buzz in/i)).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });

  // Buzz in once the read timer finishes.
  await expect(async () => {
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: /reveal answer/i }),
    ).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });

  const revealButton = page.getByRole("button", { name: /reveal answer/i });
  await expect(revealButton).toBeEnabled({ timeout: 5_000 });
  await revealButton.click();

  await page.getByRole("button", { name: /correct!/i }).click();

  // The answer is now revealed to everyone.
  await expect(
    page.getByRole("button", { name: /back to board/i }),
  ).toBeVisible({ timeout: 5_000 });
}

test.describe("undo check", () => {
  test("undoes a check on the reveal screen with confirmation", async ({
    page,
  }) => {
    await playClueAndCheckCorrect(page);

    // The undo button rides alongside "Back to board".
    const undoButton = page.getByRole("button", { name: /^undo$/i });
    await expect(undoButton).toBeVisible();
    await shot(page, "reveal-undo-alongside-back-to-board");

    // Tap one arms the confirmation; nothing is committed yet.
    await undoButton.click();
    await expect(page.getByText("Undo your check on this clue?")).toBeVisible();
    await shot(page, "reveal-confirm-armed");

    // "cancel" returns to the button row.
    await page.getByRole("button", { name: /^cancel$/i }).click();
    await expect(undoButton).toBeVisible();
    await expect(
      page.getByText("Undo your check on this clue?"),
    ).not.toBeVisible();

    // Arm again and commit. The swing is double the $200 clue value.
    await undoButton.click();
    await page.getByRole("button", { name: /undo \(\s*-\$400\s*\)/i }).click();

    // The correction is applied: the floating delta flips to -$200 and the
    // undo remains available to flip back.
    await expect(page.getByText("-$200").first()).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByRole("button", { name: /^undo$/i })).toBeVisible();
    await shot(page, "reveal-after-undo");
  });

  test("undoes a check from the board by tapping the score", async ({
    page,
  }) => {
    await playClueAndCheckCorrect(page);

    // Wait out the reveal screen; it auto-advances to the board.
    await expect(
      page.getByRole("button", { name: /back to board/i }),
    ).not.toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: "$ 200" }).first(),
    ).toBeVisible({ timeout: 10_000 });

    // The player's own score is a popover trigger while the correction
    // window is open.
    const scoreTrigger = page.getByRole("button", {
      name: "$200",
      exact: true,
    });
    await expect(scoreTrigger).toBeVisible();
    await shot(page, "board-score-underlined");

    await scoreTrigger.click();
    await expect(
      page.getByText("Undo your check on the last clue?"),
    ).toBeVisible();
    await shot(page, "board-popover-confirm");

    await page.getByRole("button", { name: /undo \(\s*-\$400\s*\)/i }).click();

    // The score flips to -$200 and the affected card pulses.
    await expect(
      page.getByRole("button", { name: "-$200", exact: true }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('[class*="animate-score-pulse"]')).toBeVisible();
    await shot(page, "board-after-undo-pulse");

    // The correction window is still open, so the undo can be undone: flip
    // back to correct (+$400).
    await page.getByRole("button", { name: "-$200", exact: true }).click();
    await expect(
      page.getByText("Undo your check on the last clue?"),
    ).toBeVisible();
    await page.getByRole("button", { name: /undo \(\s*\+\$400\s*\)/i }).click();
    await expect(
      page.getByRole("button", { name: "$200", exact: true }),
    ).toBeVisible({ timeout: 5_000 });
    await shot(page, "board-after-redo");
  });

  test("undoes a check from the round preview dialog", async ({ page }) => {
    await playClueAndCheckCorrect(page);
    await page.getByRole("button", { name: /back to board/i }).click();

    // Play the second (last) clue of round 1, then advance: the game jumps
    // straight to the round 2 preview dialog.
    await playNextClueCorrect(page);
    await page.getByRole("button", { name: /back to board/i }).click();
    await expect(page.getByText(/start round 2/i)).toBeVisible({
      timeout: 10_000,
    });

    // The correction window is still open, so the dialog offers the undo.
    await page.getByRole("button", { name: /^undo$/i }).click();
    await expect(
      page.getByText("Undo your check on the last clue?"),
    ).toBeVisible();
    await shot(page, "preview-dialog-confirm");
    await page.getByRole("button", { name: /undo \(\s*-\$400\s*\)/i }).click();

    // The confirmation closes on commit; re-arming offers the flip back.
    await expect(
      page.getByText("Undo your check on the last clue?"),
    ).not.toBeVisible();
    await page.getByRole("button", { name: /^undo$/i }).click();
    await expect(
      page.getByRole("button", { name: /undo \(\s*\+\$400\s*\)/i }),
    ).toBeVisible();
    await shot(page, "preview-dialog-after-undo");
  });
});
