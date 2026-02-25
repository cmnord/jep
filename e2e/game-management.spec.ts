import path from "path";

import { expect } from "@playwright/test";

import { test } from "./fixtures";
import { uploadGame } from "./helpers";

const MOCK_1x1_PATH = path.resolve("app/static/mock-1x1.jep.json");

/** Click the "More actions" menu for a game row, select a visibility option,
 *  and wait for the flash message confirming the update. */
async function changeVisibility(
  page: import("@playwright/test").Page,
  gameRow: import("@playwright/test").Locator,
  visibility: "Make public" | "Make private" | "Make unlisted",
) {
  await gameRow.getByRole("button", { name: "More actions" }).click();
  await page.getByText(visibility).click();
  // The PATCH action flashes "Updated game ... to ..." and redirects to /profile.
  await expect(page.getByText(/updated game/i)).toBeVisible({
    timeout: 10_000,
  });
}

test.describe("game management", () => {
  // These tests share a single uploaded game and mutate it through
  // visibility states, so they must run sequentially.
  test.describe.configure({ mode: "serial" });

  let gameId: string;

  test("authed upload skips confirmation dialog", async ({
    authedPage: page,
  }) => {
    await page.goto("/profile");
    gameId = await uploadGame(page);

    // No confirmation dialog should have appeared — success message shows directly
    await expect(page.getByText(/created new unlisted game/i)).toBeVisible();
  });

  test("guest upload shows confirmation dialog", async ({ browser }) => {
    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    await guestPage.goto("/");

    // Use the filechooser pattern so we wait for React hydration before
    // the file change event fires (the hidden input's onChange handler
    // is only attached after hydration).
    const fileChooserPromise = guestPage.waitForEvent("filechooser");
    await guestPage.locator("#upload-button").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(MOCK_1x1_PATH);

    // Confirmation dialog should appear
    await expect(guestPage.getByText(/confirm public upload/i)).toBeVisible();
    await expect(
      guestPage.getByText(/you will not be able to edit or delete/i),
    ).toBeVisible();

    // Click "Upload publicly"
    await guestPage.getByRole("button", { name: /upload publicly/i }).click();

    // Should see success message mentioning "public"
    await expect(guestPage.getByText(/created new public game/i)).toBeVisible({
      timeout: 10_000,
    });

    await guestContext.close();
  });

  test("change game visibility on profile", async ({ authedPage: page }) => {
    await page.goto("/profile");
    const gameRow = page.locator(`li:has(a[href="/game/${gameId}/play"])`);

    // Game starts as UNLISTED (from the upload test)
    await expect(
      gameRow.locator(".text-xs", { hasText: "UNLISTED" }),
    ).toBeVisible();

    // Change to private
    await changeVisibility(page, gameRow, "Make private");
    await expect(
      gameRow.locator(".text-xs", { hasText: "PRIVATE" }),
    ).toBeVisible();
  });

  test("private game inaccessible to guests", async ({ browser }) => {
    // The game was made private in the previous test.
    // Try to access as a guest (new unauthenticated context).
    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    const response = await guestPage.goto(`/game/${gameId}`);

    expect(response?.status()).toBe(404);

    await guestContext.close();
  });

  test("offline download menu visible only for logged-in users", async ({
    authedPage: page,
    browser,
  }) => {
    // Change from private → public so it appears on the home page for everyone
    await page.goto("/profile");
    const gameRow = page.locator(`li:has(a[href="/game/${gameId}/play"])`);
    await changeVisibility(page, gameRow, "Make public");

    // As authed user on /, find the game card and verify "More actions" is visible.
    await page.goto("/");
    const authedCard = page.locator(`a[href="/game/${gameId}/play"]`).first();
    await expect(authedCard).toBeVisible({ timeout: 5_000 });
    await expect(
      authedCard.getByRole("button", { name: "More actions" }),
    ).toBeVisible();

    // As a guest, the same game card should NOT have the "More actions" menu
    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    await guestPage.goto("/");
    const guestCard = guestPage
      .locator(`a[href="/game/${gameId}/play"]`)
      .first();
    await expect(guestCard).toBeVisible({ timeout: 5_000 });
    await expect(
      guestCard.getByRole("button", { name: "More actions" }),
    ).not.toBeVisible();

    await guestContext.close();
  });

  test("delete game from profile", async ({ authedPage: page }) => {
    await page.goto("/profile");
    const gameRow = page.locator(`li:has(a[href="/game/${gameId}/play"])`);
    await expect(gameRow).toBeVisible();

    // Open the three-dot menu and click "Delete game"
    await gameRow.getByRole("button", { name: "More actions" }).click();
    await page.getByText("Delete game").click();

    // Confirmation dialog should appear
    await expect(
      page.getByText(/are you sure you want to delete game/i),
    ).toBeVisible();

    // Click the "Delete game" button in the dialog
    await page.getByRole("button", { name: "Delete game" }).click();

    // Should see success flash and game gone
    await expect(page.getByText(/deleted/i)).toBeVisible({ timeout: 10_000 });
    await expect(gameRow).not.toBeVisible();
  });
});
