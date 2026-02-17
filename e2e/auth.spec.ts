import { expect, test } from "@playwright/test";

test.describe("auth", () => {
  test("redirects to login when visiting /profile unauthenticated", async ({
    page,
  }) => {
    await page.goto("/profile");

    // Should redirect to /login with redirectTo param
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fprofile/);

    // Login form should be visible
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.locator("input#password")).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel(/email address/i).fill("fake@example.com");
    await page.locator("input#password").fill("wrongpassword");
    await page
      .getByRole("main")
      .getByRole("button", { name: /log in/i })
      .click();

    // Should show an error message and stay on /login
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
