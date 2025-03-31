import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("apps/ A/B tests", () => {
  test("should render the /bookings/[status]", async ({ page, users }) => {
    const user = await users.create();

    await user.apiLogin();

    await page.goto("/bookings/upcoming/");

    const locator = page.getByTestId("horizontal-tab-upcoming");

    await expect(locator).toHaveClass(/bg-emphasis/);
  });
});
