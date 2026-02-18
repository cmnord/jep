import path from "path";

import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** Navigate to a mock game route, join, start round 1, and wait for the board
 *  fill animation to complete. */
export async function startMockGame(page: Page, route = "/mock") {
  await page.goto(route);
  await page.getByRole("button", { name: /join game/i }).click();
  await page.getByRole("button", { name: /start round/i }).click();
}

/** Play through a clue using only keyboard inputs.
 *  Assumes a clue cell is already focused. Presses Enter to select it, buzzes
 *  in, reveals the answer, marks correct, and returns to the board. */
export async function playOneClueKeyboard(page: Page) {
  // Press Enter on the focused clue cell to select it.
  await expect(async () => {
    await page.keyboard.press("Enter");
    await expect(page.getByText(/buzz in/i)).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 10_000 });

  // Press Enter to buzz in, retrying until the read timer finishes.
  await expect(async () => {
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: /reveal answer/i }),
    ).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });

  // "Reveal answer" is focused automatically after the 500ms debounce via
  // a useEffect in check-form.tsx.
  const revealButton = page.getByRole("button", { name: /reveal answer/i });
  await expect(revealButton).toBeFocused({ timeout: 5_000 });
  await page.keyboard.press("Enter");

  // "correct!" has unconditional autoFocus.
  const correctButton = page.getByRole("button", { name: /correct!/i });
  await expect(correctButton).toBeFocused({ timeout: 2_000 });
  await page.keyboard.press("Enter");

  // "Back to board" has unconditional autoFocus.
  const backButton = page.getByRole("button", { name: /back to board/i });
  await expect(backButton).toBeVisible({ timeout: 5_000 });
  await expect(backButton).toBeFocused({ timeout: 2_000 });
  await page.keyboard.press("Enter");
}

const MOCK_1x1_PATH = path.resolve("app/static/mock-1x1.jep.json");

/** Upload a .jep.json file on a page that has an Upload widget (/profile or /).
 *  For authenticated pages the form submits immediately (no confirmation dialog).
 *  Returns the game ID extracted from the "My Games" list link. */
export async function uploadGame(
  page: Page,
  filePath = MOCK_1x1_PATH,
): Promise<string> {
  // Use the filechooser pattern to go through the upload button. This ensures
  // React has hydrated before the file change event fires (the hidden input's
  // onChange handler is only attached after hydration).
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.locator("#upload-button").click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(filePath);

  // Wait for the upload action to complete and the page to update.
  await expect(page.getByText(/created new/i)).toBeVisible({ timeout: 10_000 });

  // Extract the game ID from the first game link in the "My Games" list.
  // Links have the form /game/{id}/play.
  const gameLink = page.locator('a[href*="/game/"][href*="/play"]').first();
  const href = await gameLink.getAttribute("href");
  const match = href?.match(/\/game\/([^/]+)\/play/);
  if (!match) throw new Error(`Could not extract game ID from href: ${href}`);
  return match[1];
}

/** Play through a single $200 clue and return to the board. */
export async function playOneClue(page: Page) {
  const clueButton = page.getByRole("button", { name: "$ 200" }).first();

  // The board fill animation silently ignores clicks, so retry clicking
  // until the clue prompt actually opens.
  await expect(async () => {
    await clueButton.click();
    await expect(page.getByText(/buzz in/i)).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 10_000 });

  // Press Enter to buzz in, retrying until the read timer finishes.
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

  await expect(
    page.getByRole("button", { name: /back to board/i }),
  ).toBeVisible({ timeout: 5_000 });
  await page.getByRole("button", { name: /back to board/i }).click();
}
