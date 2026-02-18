import { test, expect } from "./fixtures";
import { playOneClue, uploadGame } from "./helpers";

test.describe("solves tracking", () => {
  test("playing a game records a solve on profile", async ({
    authedPage: page,
  }) => {
    // Upload a 1x1 game (1 round, 1 category, 1 clue)
    await page.goto("/profile");
    const gameId = await uploadGame(page);

    // Navigate to the play route, which creates a real room and redirects
    await page.goto(`/game/${gameId}/play`);

    // Wait for the room page to load, then join
    await expect(
      page.getByRole("button", { name: /join game/i }),
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /join game/i }).click();

    // Start round 1
    await expect(
      page.getByRole("button", { name: /start round/i }),
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /start round/i }).click();

    // Play through the single clue
    await playOneClue(page);

    // After the last clue, the game should transition to GameOver and
    // auto-navigate to the summary page.
    await expect(page).toHaveURL(/\/summary/, { timeout: 15_000 });

    // Navigate to profile and check the solve appears
    await page.goto("/profile");
    await expect(
      page.getByRole("heading", { name: /my attempts/i }),
    ).toBeVisible();

    // The solve should show the game title in the solves section
    // Use last() since the game also appears in "My Games" above
    await expect(page.getByText("Mock 1x1 Game").last()).toBeVisible();
  });
});
