import { randomBytes, randomUUID } from "crypto";

import { expect, test } from "@playwright/test";

import { buildSiq, fixtureContentXml } from "../app/test-fixtures/siq/build";
import { clickStartRound, goto, openClue } from "./helpers";

const STORAGE_PATH = "/storage/v1/object/public/game-media/";

interface ExportedGame {
  title: string;
  boards: {
    categories: {
      clues: { media?: { type: string; src: string }[]; secret?: boolean }[];
    }[];
  }[];
}

test.describe("SIGame pack import", () => {
  test("a guest imports a .siq pack and plays a picture question from storage", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const title = `E2E SIQ ${randomUUID().slice(0, 8)}`;
    const siq = buildSiq("v5", {
      "content.xml": fixtureContentXml("v5").replace(
        'name="Test pack v5"',
        `name="${title}"`,
      ),
    });

    await goto(page, "/");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator("#upload-button").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "e2e-pack.siq",
      mimeType: "application/octet-stream",
      buffer: Buffer.from(siq),
    });
    await expect(page.getByText(/confirm public upload/i)).toBeVisible();
    await page.getByRole("button", { name: /upload publicly/i }).click();

    // The summary: counts, skipped questions and the warnings list.
    await expect(
      page.getByText(
        `Imported SIGame pack "${title}": 2 rounds, 4 categories, 10 questions, 5 media files.`,
        { exact: false },
      ),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/created new public game/i)).toBeVisible();
    const details = page.getByTestId("form-state-details");
    await expect(details).toContainText('file "missing.png" is missing');
    await expect(details).toContainText("only the theme");

    // The game is listed on the home page.
    await goto(page, `/?q=${encodeURIComponent(title)}`);
    const card = page.locator('a[href^="/game/"][href$="/play"]', {
      hasText: title,
    });
    await expect(card).toBeVisible();
    const href = await card.getAttribute("href");
    const gameId = href?.match(/\/game\/([^/]+)\/play/)?.[1];
    expect(gameId).toBeTruthy();

    // The game page offers the JSON download; media points at storage.
    await goto(page, `/game/${gameId}`);
    const download = page.getByRole("link", { name: /download json/i });
    await expect(download).toHaveAttribute("href", `/game/${gameId}/json`);
    const response = await page.request.get(`/game/${gameId}/json`);
    expect(response.ok()).toBe(true);
    const exported: ExportedGame = await response.json();
    expect(exported.title).toBe(title);
    const first = exported.boards[0].categories[0].clues[0];
    expect(first.media?.[0].type).toBe("image");
    expect(first.media?.[0].src).toContain(STORAGE_PATH);
    expect(exported.boards[0].categories[0].clues[2].secret).toBe(true);

    // Play it solo: the first question shows the picture from storage.
    await goto(page, `/game/${gameId}/solo`);
    await page.getByRole("button", { name: /join game/i }).click();
    await clickStartRound(page);
    await openClue(page, page.getByRole("button", { name: "$ 100" }).first());
    await expect(page.getByText("What color is this dot?")).toBeVisible();
    const image = page.locator(`img[src*="${STORAGE_PATH}"]`).first();
    await expect(image).toBeVisible();
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBe(8);
  });

  test("a broken pack shows an error", async ({ page }) => {
    await goto(page, "/");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator("#upload-button").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "broken.siq",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("this is not a zip"),
    });
    await page.getByRole("button", { name: /upload publicly/i }).click();
    await expect(page.getByRole("alert")).toContainText(
      "The file is not a SIGame pack",
      { timeout: 10_000 },
    );
  });
});

test.describe("SIGame pack upload screen", () => {
  // Requests from pages a service worker controls bypass interception.
  test.use({ serviceWorkers: "block" });

  test("shows upload progress, then the importing stage, then the summary", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const title = `E2E SIQ progress ${randomUUID().slice(0, 8)}`;
    const siq = buildSiq("v5", {
      "content.xml": fixtureContentXml("v5").replace(
        'name="Test pack v5"',
        `name="${title}"`,
      ),
      // An unreferenced (and incompressible) file makes the upload take a
      // moment on the throttled connection below.
      "Images/padding.bin": new Uint8Array(randomBytes(300 * 1024)),
    });

    // Slow uploads (about 2 s for the pack) and hold the server's answer for
    // 2 s, so both stages are observable. Unlike page.route, pausing at the
    // response stage lets the browser send the body (and report progress).
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: 150 * 1024,
    });
    await cdp.send("Fetch.enable", {
      patterns: [
        { urlPattern: "*/game?redirectTo=*", requestStage: "Response" },
      ],
    });
    cdp.on("Fetch.requestPaused", (event) => {
      setTimeout(() => {
        void cdp
          .send("Fetch.continueRequest", { requestId: event.requestId })
          .catch(() => {});
      }, 2_000);
    });

    await goto(page, "/");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator("#upload-button").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "progress-pack.siq",
      mimeType: "application/octet-stream",
      buffer: Buffer.from(siq),
    });
    await page.getByRole("button", { name: /upload publicly/i }).click();

    // Stage 1: uploading, with a real progress bar.
    const overlay = page.getByTestId("upload-progress");
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText("progress-pack.siq");
    await expect(
      overlay.getByRole("heading", { name: "Uploading…" }),
    ).toBeVisible();
    await expect(
      overlay.getByRole("progressbar", { name: "Upload progress" }),
    ).toHaveAttribute("aria-valuenow", /^\d+$/);
    // A second file can't be submitted meanwhile.
    await expect(page.locator("#upload")).toBeDisabled();

    // Stage 2: the server imports the pack.
    await expect(
      overlay.getByRole("heading", { name: "Importing the pack…" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(overlay).toContainText("large packs can take a minute");
    await expect(
      overlay.getByRole("progressbar", { name: "Processing on the server" }),
    ).toBeVisible();

    // Done: the summary as before.
    await expect(
      page.getByText(`Imported SIGame pack "${title}"`, { exact: false }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(overlay).toBeHidden();
    await expect(page.getByTestId("form-state-details")).toContainText(
      'file "missing.png" is missing',
    );
    await expect(page.locator("#upload")).toBeEnabled();
  });
});
