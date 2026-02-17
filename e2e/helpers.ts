import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

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
