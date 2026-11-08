import { test, expect } from "./fixtures";
import { uploadGame } from "./helpers";

test.describe("joining rooms", () => {
  test("joining before the realtime channel connects still joins", async ({
    authedPage: page,
  }) => {
    await page.goto("/profile");
    const gameId = await uploadGame(page);

    await page.context().routeWebSocket(/\/realtime\//, () => {});

    await page.goto(`/game/${gameId}/play`);
    await expect(page).toHaveURL(/\/room\/\d+-\w+$/);

    const joinButton = page.getByRole("button", { name: /join game/i });
    await joinButton.click();

    await expect(joinButton).toBeHidden({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: /start round/i }),
    ).toBeVisible();
    await expect(page.getByText(/^Connected/)).toBeHidden();
  });
});
