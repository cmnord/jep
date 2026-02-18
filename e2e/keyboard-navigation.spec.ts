import { expect, test } from "@playwright/test";

import { playOneClueKeyboard, startMockGame } from "./helpers";

test.describe("keyboard navigation: board grid", () => {
  test.beforeEach(async ({ page }) => {
    await startMockGame(page, "/mock?game=3x3");

    // Wait for board fill animation to complete — all 9 cells must have their
    // accessible names (cells with visibility:hidden text don't match).
    await expect(page.getByRole("button", { name: "$ 600" })).toHaveCount(3, {
      timeout: 10_000,
    });
  });

  test("arrow keys move focus between cells", async ({ page }) => {
    // The 3x3 grid layout (row-major):
    //   [0][0]=$200  [0][1]=$200  [0][2]=$200
    //   [1][0]=$400  [1][1]=$400  [1][2]=$400
    //   [2][0]=$600  [2][1]=$600  [2][2]=$600

    // Focus the top-left cell to start.
    const topLeft = page.getByRole("button", { name: "$ 200" }).first();
    await topLeft.focus();
    await expect(topLeft).toBeFocused();

    // ArrowRight: [0][0] → [0][1]
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("button", { name: "$ 200" }).nth(1),
    ).toBeFocused();

    // ArrowDown: [0][1] → [1][1]
    await page.keyboard.press("ArrowDown");
    await expect(
      page.getByRole("button", { name: "$ 400" }).nth(1),
    ).toBeFocused();

    // ArrowLeft: [1][1] → [1][0]
    await page.keyboard.press("ArrowLeft");
    await expect(
      page.getByRole("button", { name: "$ 400" }).first(),
    ).toBeFocused();

    // ArrowUp: [1][0] → [0][0]
    await page.keyboard.press("ArrowUp");
    await expect(topLeft).toBeFocused();
  });

  test("WASD keys move focus between cells", async ({ page }) => {
    // Focus the center cell [1][1].
    const center = page.getByRole("button", { name: "$ 400" }).nth(1);
    await center.focus();
    await expect(center).toBeFocused();

    // w (up): [1][1] → [0][1]
    await page.keyboard.press("w");
    await expect(
      page.getByRole("button", { name: "$ 200" }).nth(1),
    ).toBeFocused();

    // s (down): [0][1] → [1][1]
    await page.keyboard.press("s");
    await expect(center).toBeFocused();

    // d (right): [1][1] → [1][2]
    await page.keyboard.press("d");
    await expect(
      page.getByRole("button", { name: "$ 400" }).nth(2),
    ).toBeFocused();

    // a (left): [1][2] → [1][1]
    await page.keyboard.press("a");
    await expect(center).toBeFocused();
  });

  test("arrow keys stop at grid boundaries", async ({ page }) => {
    // Focus top-left cell [0][0].
    const topLeft = page.getByRole("button", { name: "$ 200" }).first();
    await topLeft.focus();
    await expect(topLeft).toBeFocused();

    // ArrowUp at top edge — stays put.
    await page.keyboard.press("ArrowUp");
    await expect(topLeft).toBeFocused();

    // ArrowLeft at left edge — stays put.
    await page.keyboard.press("ArrowLeft");
    await expect(topLeft).toBeFocused();

    // Navigate to bottom-right cell [2][2].
    const bottomRight = page.getByRole("button", { name: "$ 600" }).nth(2);
    await bottomRight.focus();
    await expect(bottomRight).toBeFocused();

    // ArrowDown at bottom edge — stays put.
    await page.keyboard.press("ArrowDown");
    await expect(bottomRight).toBeFocused();

    // ArrowRight at right edge — stays put.
    await page.keyboard.press("ArrowRight");
    await expect(bottomRight).toBeFocused();
  });

  test("Enter on focused cell opens the clue", async ({ page }) => {
    const clueCell = page.getByRole("button", { name: "$ 200" }).first();

    // The board fill animation silently ignores Enter, so retry until the
    // clue prompt actually opens.
    await expect(async () => {
      await clueCell.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByText(/buzz in/i)).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });
  });
});

test.describe("keyboard navigation: clue flow", () => {
  test("can play a full clue using only keyboard", async ({ page }) => {
    await startMockGame(page);

    // Focus the first $200 cell.
    const clueCell = page.getByRole("button", { name: "$ 200" }).first();
    await expect(async () => {
      await clueCell.focus();
      await expect(clueCell).toBeFocused({ timeout: 500 });
    }).toPass({ timeout: 10_000 });

    // Play through the entire clue via keyboard.
    await playOneClueKeyboard(page);

    // Verify we're back on the board.
    await expect(page.getByRole("button", { name: "$ 200" })).toHaveCount(2);
  });
});
