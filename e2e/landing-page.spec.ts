import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("guest user can upload a game", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /upload/i }).click();

    const fileInput = page.locator("input[type=file]");
    await fileInput.setInputFiles({
      name: "incomplete-board.jep.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ name: "test board" })),
    });

    await page.getByRole("button", { name: /upload publicly/i }).click();
    await expect(page.getByRole("alert")).toBeVisible();
  });

  test("can search for games", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.getByPlaceholder("Search games...");
    // Use pressSequentially to simulate real typing, which triggers
    // React's onChange on each keystroke for the debounce to work.
    await searchInput.pressSequentially("nonexistent-query-xyz", {
      delay: 50,
    });

    // After debounce (500ms) + server round-trip, the "no games found"
    // message should appear.
    await expect(page.getByText(/no games found/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
