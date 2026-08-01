import { expect, test } from "@playwright/test";

import { playOneClue, startMockGame } from "./helpers";

test.describe("solo game", () => {
  test("can play through a mock game clue", async ({ page }) => {
    await page.goto("/mock");

    // Join the game from the preview dialog
    await page.getByRole("button", { name: /join game/i }).click();

    // Start round 1
    await page.getByRole("button", { name: /start round/i }).click();

    // Wait for board fill animation to finish, then click a $200 clue.
    // The accessible name has a space between "$" and "200" due to separate spans.
    const clueButton = page.getByRole("button", { name: "$ 200" }).first();

    // The board fill animation silently ignores clicks, so retry clicking
    // until the clue prompt actually opens.
    await expect(async () => {
      await clueButton.click();
      await expect(page.getByText(/buzz in/i)).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });

    // The clue prompt opens full-screen. The clue text is a button that's
    // disabled until the read timer finishes, then we can click to buzz in.
    // Press Enter to buzz in, retrying until the read timer finishes.
    await expect(async () => {
      await page.keyboard.press("Enter");
      await expect(
        page.getByRole("button", { name: /reveal answer/i }),
      ).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });

    // After buzzing in, we see "Reveal answer" button (with a short debounce)
    const revealButton = page.getByRole("button", {
      name: /reveal answer/i,
    });
    await expect(revealButton).toBeEnabled({ timeout: 5_000 });
    await revealButton.click();

    // Now we see correct/incorrect buttons. Click "correct!"
    await page.getByRole("button", { name: /correct!/i }).click();

    // The "Back to board" button auto-submits after a countdown, or we can
    // click it. Verify it appears showing we completed the clue flow.
    await expect(
      page.getByRole("button", { name: /back to board/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("hides a completed category name and reveals it on demand", async ({
    page,
  }) => {
    await startMockGame(page);

    const completedCategory = page.getByRole("columnheader", {
      name: "Round 1, Category 1",
      exact: true,
    });
    const openCategory = page.getByRole("columnheader", {
      name: "Round 1, Category 2",
      exact: true,
    });

    await expect(completedCategory).toBeVisible({ timeout: 10_000 });
    await playOneClue(page);

    const completedCategoryHeader = page.getByRole("columnheader", {
      name: "Show completed category",
    });
    await expect(completedCategoryHeader).toBeVisible();
    await expect(
      completedCategoryHeader.getByText("Round 1, Category 1", {
        exact: true,
      }),
    ).toBeHidden();
    await expect(openCategory).toBeVisible();

    await page.getByRole("button", { name: "Show completed category" }).click();
    await expect(
      page.getByRole("dialog").getByText("Round 1, Category 1", {
        exact: true,
      }),
    ).toBeVisible();
  });
});
