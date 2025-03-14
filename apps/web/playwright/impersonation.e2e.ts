import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });
/* eslint-disable playwright/no-skipped-test */
test.skip("[EE feature] Users can impersonate", async () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });
  test("App Admin can impersonate users with impersonation enabled", async ({ page, users }) => {
    // log in trail user
    const user = await users.create({
      role: "ADMIN",
      password: "ADMINadmin2022!",
    });

    const userToImpersonate = await users.create({ disableImpersonation: false });

    await user.apiLogin();
    await page.goto("/settings/admin/impersonation");
    await expect(page.getByText("User Impersonation")).toBeVisible();
    const adminInput = page.getByTestId("admin-impersonation-input");
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore the username does exist
    await adminInput.fill(userToImpersonate.username);
    await page.getByTestId("impersonation-submit").click();

    // // Wait for sign in to complete
    await page.waitForURL("/event-types");
    await page.goto("/settings/profile");

    const stopImpersonatingButton = page.getByTestId("stop-impersonating-button");

    const impersonatedUsernameInput = page.locator("input[name='username']");
    const impersonatedUser = await impersonatedUsernameInput.inputValue();

    await expect(stopImpersonatingButton).toBeVisible();
    await expect(impersonatedUser).toBe(userToImpersonate.username);

    await stopImpersonatingButton.click();
    await expect(stopImpersonatingButton).toBeHidden();

    // Return to user
    const ogUser = await impersonatedUsernameInput.inputValue();

    expect(ogUser).toBe(user.username);
  });
});
