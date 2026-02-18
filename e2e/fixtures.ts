import "dotenv/config";
import { test as base, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_TEST_EMAIL ?? "playwright@test.local";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "test-password";

type AuthFixtures = {
  authedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authedPage: async ({ browser }, use) => {
    const context = await browser.newContext();

    // POST to /login using the context's request API.
    // Playwright stores the Set-Cookie from the response in the context's
    // cookie jar, so any page opened in this context will be authenticated.
    const response = await context.request.post("/login", {
      form: { email: EMAIL, password: PASSWORD },
    });

    if (!response.ok()) {
      throw new Error(
        `Login failed (${response.status()}): ${await response.text()}`,
      );
    }

    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from "@playwright/test";
export { EMAIL as TEST_EMAIL };
