import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("Settings/admin tests", () => {
  test("should render /settings/admin page", async ({ page, users, context }) => {
    const user = await users.create({
      role: "ADMIN",
    });
    await user.apiLogin();

    await page.goto("/settings/admin");

    await page.waitForLoadState();

    const locator = page.getByRole("heading", { name: "Feature Flags" });

    await expect(locator).toBeVisible();
  });

  test("Can create a team", async ({ page, users }) => {
    const user = await users.create({
      role: "ADMIN",
    });
    await user.apiLogin();

    await page.goto("/settings/admin");

    // Open create team dialog
    await page.locator('[data-testid="vertical-tab-Add a team"]').click();

    const dialog = page.getByRole("dialog").locator("button", { hasText: "Submit" });
    await expect(dialog).toBeVisible();

    // Create Team
    const teamName = "Test Admin Team";

    await page.locator('input[name="name"]').fill(teamName);

    await page.click("[type=submit]");

    await expect(dialog).toBeHidden();

    // Check if team is created
    const teamTab = page.getByTestId("tab-teams").locator(`:text("${teamName}")`);
    await expect(teamTab).toBeVisible();
  });
});
