import { expect, test } from "@playwright/test";

test.describe("browser translation is disabled", () => {
  for (const path of ["/", "/mock", "/howto", "/this-page-does-not-exist"]) {
    test(`on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("translate", "no");
      await expect(page.locator('meta[name="google"]')).toHaveAttribute(
        "content",
        "notranslate",
      );
    });
  }
});
