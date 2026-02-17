import { expect, test } from "@playwright/test";

import { playOneClue } from "./helpers";

test.describe("solo game persistence", () => {
  test("persists game state and shows resume prompt on reload", async ({
    page,
  }) => {
    await page.goto("/mockPersistent");

    await page.getByRole("button", { name: /join game/i }).click();
    await page.getByRole("button", { name: /start round/i }).click();

    await playOneClue(page);

    // Wait for debounced save (300ms debounce + margin)
    await page.waitForTimeout(500);

    await page.reload();

    // Resume prompt should appear
    await expect(
      page.getByRole("heading", { name: "Game in progress" }),
    ).toBeVisible({
      timeout: 5_000,
    });

    // Click Resume Game
    await page.getByRole("button", { name: /resume game/i }).click();

    // Should see the board (not PreviewRound) — no join/start buttons
    await expect(
      page.getByRole("button", { name: /join game/i }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: /start round/i }),
    ).not.toBeVisible();
  });

  test("new game clears saved state", async ({ page }) => {
    await page.goto("/mockPersistent");

    await page.getByRole("button", { name: /join game/i }).click();
    await page.getByRole("button", { name: /start round/i }).click();

    await playOneClue(page);

    // Wait for debounced save
    await page.waitForTimeout(500);

    await page.reload();

    // Resume prompt appears
    await expect(
      page.getByRole("heading", { name: "Game in progress" }),
    ).toBeVisible({
      timeout: 5_000,
    });

    // Click "New Game"
    await page.getByRole("button", { name: /new game/i }).click();

    // Should see fresh game state
    await expect(page.getByRole("button", { name: /join game/i })).toBeVisible({
      timeout: 5_000,
    });

    // Reload again — no resume prompt this time
    await page.reload();
    await expect(page.getByRole("button", { name: /join game/i })).toBeVisible({
      timeout: 5_000,
    });
    await expect(
      page.getByRole("heading", { name: "Game in progress" }),
    ).not.toBeVisible();
  });
});
