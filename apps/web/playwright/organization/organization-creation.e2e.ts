import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { JSDOM } from "jsdom";
import type { Messages } from "mailhog";
import path from "path";
import { uuid } from "short-uuid";

import type { createEmailsFixture } from "../fixtures/emails";
import { test } from "../lib/fixtures";
import { getEmailsReceivedByUser } from "../lib/testUtils";
import { gotoPathAndExpectRedirectToOrgDomain } from "./lib/gotoPathAndExpectRedirectToOrgDomain";

async function expectEmailWithSubject(
  page: Page,
  emails: ReturnType<typeof createEmailsFixture>,
  userEmail: string,
  subject: string
) {
  if (!emails) return null;

  // eslint-disable-next-line playwright/no-wait-for-timeout
  await page.waitForTimeout(2000);
  const receivedEmails = await getEmailsReceivedByUser({ emails, userEmail });

  const allEmails = (receivedEmails as Messages).items;
  const email = allEmails.find((email) => email.subject === subject);
  if (!email) {
    throw new Error(`Email with subject ${subject} not found`);
  }
  const dom = new JSDOM(email.html);
  return dom;
}

export async function expectOrganizationCreationEmailToBeSent({
  page,
  emails,
  userEmail,
  orgSlug,
}: {
  page: Page;
  emails: ReturnType<typeof createEmailsFixture>;
  userEmail: string;
  orgSlug: string;
}) {
  const dom = await expectEmailWithSubject(page, emails, userEmail, "Your organization has been created");
  const document = dom?.window?.document;
  expect(document?.querySelector(`[href*=${orgSlug}]`)).toBeTruthy();
  return dom;
}

async function expectOrganizationCreationEmailToBeSentWithLinks({
  page,
  emails,
  userEmail,
  oldUsername,
  newUsername,
  orgSlug,
}: {
  page: Page;
  emails: ReturnType<typeof createEmailsFixture>;
  userEmail: string;
  oldUsername: string;
  newUsername: string;
  orgSlug: string;
}) {
  const dom = await expectOrganizationCreationEmailToBeSent({
    page,
    emails,
    userEmail,
    orgSlug,
  });
  const document = dom?.window.document;
  const links = document?.querySelectorAll(`[data-testid="organization-link-info"] [href]`);
  if (!links) {
    throw new Error(`data-testid="organization-link-info doesn't have links`);
  }
  expect((links[0] as unknown as HTMLAnchorElement).href).toContain(oldUsername);
  expect((links[1] as unknown as HTMLAnchorElement).href).toContain(newUsername);
}

export async function expectEmailVerificationEmailToBeSent(
  page: Page,
  emails: ReturnType<typeof createEmailsFixture>,
  userEmail: string
) {
  const subject = "Cal.com: Verify your account";
  return expectEmailWithSubject(page, emails, userEmail, subject);
}

test.afterEach(({ users, orgs }) => {
  users.deleteAll();
  orgs.deleteAll();
});

function capitalize(text: string) {
  if (!text) {
    return text;
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}
/* eslint-disable playwright/no-skipped-test */
test.skip("[EE feature] Organization", () => {
  test("Admin should be able to create an org where an existing user is made an owner", async ({
    page,
    users,
    emails,
  }) => {
    const appLevelAdmin = await users.create({
      role: "ADMIN",
    });
    await appLevelAdmin.apiLogin();

    const orgOwnerUsernamePrefix = "owner";

    const orgOwnerEmail = users.trackEmail({
      username: orgOwnerUsernamePrefix,
      domain: `example.com`,
    });

    const orgOwnerUser = await users.create({
      username: orgOwnerUsernamePrefix,
      email: orgOwnerEmail,
      role: "ADMIN",
    });

    const orgOwnerUsernameOutsideOrg = orgOwnerUser.username;
    const orgOwnerUsernameInOrg = orgOwnerEmail.split("@")[0];
    const orgName = capitalize(`${orgOwnerUser.username}`);
    const orgSlug = `myOrg-${uuid()}`.toLowerCase();
    await page.goto("/settings/organizations/new");

    await test.step("Basic info", async () => {
      // Check required fields
      await page.locator("button[type=submit]").click();
      await expect(page.locator(".text-red-700")).toHaveCount(3);

      // Happy path
      await fillAndSubmitFirstStepAsAdmin(page, orgOwnerEmail, orgName, orgSlug);
    });

    await expectOrganizationCreationEmailToBeSentWithLinks({
      page,
      emails,
      userEmail: orgOwnerEmail,
      oldUsername: orgOwnerUsernameOutsideOrg || "",
      newUsername: orgOwnerUsernameInOrg,
      orgSlug,
    });

    await test.step("About the organization", async () => {
      // Choosing an avatar
      await page.locator('button:text("Upload")').click();
      const fileChooserPromise = page.waitForEvent("filechooser");
      await page.getByText("Choose a file...").click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(path.join(__dirname, "../../public/apple-touch-icon.png"));
      await page.locator('button:text("Save")').click();

      // About text
      await page.locator('textarea[name="about"]').fill("This is a testing org");
      await page.locator("button[type=submit]").click();

      // Waiting to be in next step URL
      await page.waitForURL("/settings/organizations/*/onboard-members");
    });

    await test.step("On-board administrators", async () => {
      await page.waitForSelector('[data-testid="pending-member-list"]');
      await expect(page.getByTestId("pending-member-item")).toHaveCount(1);

      const adminEmail = users.trackEmail({ username: "rick", domain: `example.com` });

      //can add members
      await page.getByTestId("new-member-button").click();
      await page.locator('[placeholder="email\\@example\\.com"]').fill(adminEmail);
      await page.getByTestId("invite-new-member-button").click();
      await expect(page.locator(`li:has-text("${adminEmail}")`)).toBeVisible();
      // TODO: Check if invited admin received the invitation email
      // await expectInvitationEmailToBeReceived(
      //   page,
      //   emails,
      //   adminEmail,
      //   `${orgName}'s admin invited you to join the organization ${orgName} on Cal.com`
      // );
      await expect(page.getByTestId("pending-member-item")).toHaveCount(2);

      // can remove members
      await expect(page.getByTestId("pending-member-item")).toHaveCount(2);
      const lastRemoveMemberButton = page.getByTestId("remove-member-button").last();
      await lastRemoveMemberButton.click();
      await expect(page.getByTestId("pending-member-item")).toHaveCount(1);
      await page.getByTestId("publish-button").click();
      // Waiting to be in next step URL
      await page.waitForURL("/settings/organizations/*/add-teams");
    });

    await test.step("Create teams", async () => {
      // Filling one team
      await page.locator('input[name="teams.0.name"]').fill("Marketing");

      // Adding another team
      await page.locator('button:text("Add a team")').click();
      await page.locator('input[name="teams.1.name"]').fill("Sales");

      // Finishing the creation wizard
      await page.getByTestId("continue_or_checkout").click();
      await page.waitForURL("/event-types");
    });

    // Verify that the owner's old username redirect is properly set
    await gotoPathAndExpectRedirectToOrgDomain({
      page,
      org: {
        slug: orgSlug,
      },
      path: `/${orgOwnerUsernameOutsideOrg}`,
      expectedPath: `/${orgOwnerUsernameInOrg}`,
    });
  });

  test("Admin should be able to create an org where the owner doesn't exist yet", async ({
    page,
    users,
    emails,
  }) => {
    const appLevelAdmin = await users.create({
      role: "ADMIN",
    });
    await appLevelAdmin.apiLogin();
    const orgOwnerUsername = `owner`;
    const orgName = capitalize(`${orgOwnerUsername}`);
    const orgSlug = `myOrg-${uuid()}`.toLowerCase();
    const orgOwnerEmail = users.trackEmail({
      username: orgOwnerUsername,
      domain: `example.com`,
    });

    await page.goto("/settings/organizations/new");

    await test.step("Basic info", async () => {
      // Check required fields
      await page.locator("button[type=submit]").click();
      await expect(page.locator(".text-red-700")).toHaveCount(3);

      // Happy path
      await fillAndSubmitFirstStepAsAdmin(page, orgOwnerEmail, orgName, orgSlug);
    });

    const dom = await expectOrganizationCreationEmailToBeSent({
      page,
      emails,
      userEmail: orgOwnerEmail,
      orgSlug,
    });
    expect(dom?.window.document.querySelector(`[href*=${orgSlug}]`)).toBeTruthy();
    await expectEmailVerificationEmailToBeSent(page, emails, orgOwnerEmail);
    // Rest of the steps remain same as org creation with existing user as owner. So skipping them
  });
});

async function fillAndSubmitFirstStepAsAdmin(
  page: Page,
  targetOrgEmail: string,
  orgName: string,
  orgSlug: string
) {
  await page.locator("input[name=orgOwnerEmail]").fill(targetOrgEmail);
  // Since we are admin fill in this infomation instead of deriving it
  await page.locator("input[name=name]").fill(orgName);
  await page.locator("input[name=slug]").fill(orgSlug);

  // Fill in seat infomation
  await page.locator("input[name=seats]").fill("30");

  await Promise.all([
    page.waitForResponse("**/api/trpc/organizations/create**"),
    page.locator("button[type=submit]").click(),
  ]);
}
