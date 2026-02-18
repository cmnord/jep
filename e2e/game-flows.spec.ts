import { expect, test } from "@playwright/test";

import { playOneClue, startMockGame } from "./helpers";

test.describe("endgame flow", () => {
  test("game over after last clue", async ({ page }) => {
    await startMockGame(page, "/mock?game=1x1");

    await playOneClue(page);

    // After playing the only clue, game ends and navigates to summary.
    await expect(page).toHaveURL(/\/room\/.*\/summary/, { timeout: 5_000 });
  });
});

test.describe("wager flow", () => {
  test("wagerable clue flow", async ({ page }) => {
    await startMockGame(page, "/mock?game=wager");

    // Click the single wagerable $200 clue.
    const clueButton = page.getByRole("button", { name: "$ 200" }).first();
    await expect(async () => {
      await clueButton.click();
      await expect(page.getByText(/how much will you wager/i)).toBeVisible({
        timeout: 1_000,
      });
    }).toPass({ timeout: 10_000 });

    // Wager form is visible with input and submit.
    const wagerInput = page.locator('input[name="wager"]');
    await wagerInput.fill("100");
    await page.getByRole("button", { name: /submit/i }).click();

    // After wager submission, clue reading begins. Buzz in with Enter.
    await expect(async () => {
      await page.keyboard.press("Enter");
      await expect(
        page.getByRole("button", { name: /reveal answer/i }),
      ).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });

    // Reveal and check correct.
    const revealButton = page.getByRole("button", { name: /reveal answer/i });
    await expect(revealButton).toBeEnabled({ timeout: 5_000 });
    await revealButton.click();
    await page.getByRole("button", { name: /correct!/i }).click();

    // Score should reflect the wager ($0 + $100 = $100).
    await expect(page.getByText("$100")).toBeVisible({ timeout: 5_000 });

    // Back to board leads to game over (only clue).
    await expect(
      page.getByRole("button", { name: /back to board/i }),
    ).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: /back to board/i }).click();

    await expect(page).toHaveURL(/\/room\/.*\/summary/, { timeout: 5_000 });
  });

  test("all-in button sets max wager", async ({ page }) => {
    await startMockGame(page, "/mock?game=wager");

    // Open the wagerable clue.
    const clueButton = page.getByRole("button", { name: "$ 200" }).first();
    await expect(async () => {
      await clueButton.click();
      await expect(page.getByText(/how much will you wager/i)).toBeVisible({
        timeout: 1_000,
      });
    }).toPass({ timeout: 10_000 });

    // Click "All-in" and verify the input value changes.
    await page.getByRole("button", { name: /all-in/i }).click();
    const wagerInput = page.locator('input[name="wager"]');
    await expect(wagerInput).toHaveValue("200");
  });
});

test.describe("long-form clue flow", () => {
  test("long-form clue with zero score", async ({ page }) => {
    await startMockGame(page, "/mock?game=longForm");

    // Long-form clue renders as a single large category button.
    const finalClue = page.getByRole("button", { name: /final category/i });
    await expect(async () => {
      await finalClue.click();
      await expect(
        page.getByText(/no one has enough money to wager/i),
      ).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });

    // The clue text should still be visible for reading.
    await expect(page.getByText("long form clue")).toBeVisible();

    // "Reveal answer" button appears to advance past the reading phase.
    const revealButton = page.getByRole("button", { name: /reveal answer/i });
    await expect(revealButton).toBeVisible({ timeout: 5_000 });
    await revealButton.click();

    // Answer is shown and "Back to board" appears.
    await expect(page.getByText("long form answer")).toBeVisible({
      timeout: 5_000,
    });
    await expect(
      page.getByRole("button", { name: /back to board/i }),
    ).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: /back to board/i }).click();

    // Game ends and navigates to summary.
    await expect(page).toHaveURL(/\/room\/.*\/summary/, { timeout: 5_000 });
  });
});
