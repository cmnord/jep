import { expect, test } from "@playwright/test";

import { goto } from "./helpers";

// Browser translation rewrites text nodes behind React's back and crashes the
// app on the next update ("Failed to execute 'removeChild' on 'Node'"). Every
// document must opt out; the site has its own Ukrainian UI.
test.describe("browser translation is disabled", () => {
  for (const path of ["/", "/mock", "/howto", "/this-page-does-not-exist"]) {
    test(`on ${path}`, async ({ page }) => {
      await goto(page, path).catch(() => page.goto(path));
      await expect(page.locator("html")).toHaveAttribute("translate", "no");
      await expect(page.locator('meta[name="google"]')).toHaveAttribute(
        "content",
        "notranslate",
      );
    });
  }
});
