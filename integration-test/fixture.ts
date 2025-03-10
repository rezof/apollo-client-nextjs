import { test as base, expect } from "@playwright/test";

declare global {
  namespace PlaywrightTest {
    interface Matchers<R, T> {
      toBeInitiallyLoading(expectedState: boolean): R;
    }
  }
}

expect.extend({
  async toBeInitiallyLoading(
    received: import("@playwright/test").Page,
    expectedState: boolean
  ) {
    const pass =
      (await received.getByText("loading").isVisible()) === expectedState;
    return {
      message: () => (pass ? "passed" : "failed"),
      pass,
    };
  },
});

export const test = base.extend<{
  blockRequest: import("@playwright/test").Page;
}>({
  page: async ({ page }, use) => {
    page.on("pageerror", (error) => {
      expect(error.stack || error).toBe("no error");
    });
    // this prevents the playwright http cache to kick in in test development
    page.route("**", (route) => route.continue());
    await use(page);
  },
  blockRequest: async ({ page }, use) => {
    await page.routeFromHAR("./empty.har", {
      url: "**/graphql",
      notFound: "abort",
    });
    await use(page);
  },
});
