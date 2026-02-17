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
});
