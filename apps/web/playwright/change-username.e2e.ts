import { expect } from "@playwright/test";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { MembershipRole } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";
import { moveUserToOrg } from "./lib/orgMigration";
import { submitAndWaitForResponse } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

const IS_SELF_HOSTED = !(
  new URL(WEBAPP_URL).hostname.endsWith(".cal.dev") || !!new URL(WEBAPP_URL).hostname.endsWith(".cal.com")
);

const TESTING_USERNAMES = [
  {
    username: "demousernamex",
    description: "",
  },
  {
    username: "demo.username",
    description: " to include periods(or dots)",
  },
];

test.describe("Change username on settings", () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  TESTING_USERNAMES.forEach((item) => {
    test(`User can change username${item.description}`, async ({ page, users, prisma }) => {
      const user = await users.create();
      await user.apiLogin();
      // Try to go homepage
      await page.goto("/settings/my-account/profile");
      // Change username from normal to normal
      const usernameInput = page.locator("[data-testid=username-input]");

      await usernameInput.fill(item.username);
      await page.click("[data-testid=update-username-btn]");
      await submitAndWaitForResponse(page, "/api/trpc/viewer/updateProfile?batch=1", {
        action: () => page.click("[data-testid=save-username]"),
      });

      const newUpdatedUser = await prisma.user.findUniqueOrThrow({
        where: {
          id: user.id,
        },
      });

      expect(newUpdatedUser.username).toBe(item.username);
    });
  });

  test("User can't take a username that has been migrated to a different username in an organization", async ({
    users,
    orgs,
    page,
  }) => {
    const existingUser =
      await test.step("Migrate user to a different username in an organization", async () => {
        const org = await orgs.create({
          name: "TestOrg",
        });

        const existingUser = await users.create({
          username: "john",
          emailDomain: org.organizationSettings?.orgAutoAcceptEmail ?? "",
          name: "John Outside Organization",
        });

        await moveUserToOrg({
          user: existingUser,
          targetOrg: {
            // Changed username. After this there is no user with username equal to {existingUser.username}
            username: `${existingUser.username}-org`,
            id: org.id,
            membership: {
              role: MembershipRole.MEMBER,
              accepted: true,
            },
          },
          shouldMoveTeams: false,
        });
        return existingUser;
      });

    await test.step("Changing username for another user to the previous username of migrated user - shouldn't be allowed", async () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const previousUsername = existingUser.username!;

      const user = await users.create();
      await user.apiLogin();

      await page.goto("/settings/my-account/profile");
      const usernameInput = page.locator("[data-testid=username-input]");

      await usernameInput.fill(previousUsername);
      await expect(page.locator("[data-testid=update-username-btn]").nth(0)).toBeHidden();
      await expect(page.locator("[data-testid=update-username-btn]").nth(1)).toBeHidden();
    });
  });
});
