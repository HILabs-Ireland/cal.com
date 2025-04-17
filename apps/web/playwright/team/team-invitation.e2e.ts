import { expect } from "@playwright/test";

import { prisma } from "@calcom/prisma";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";

import { test } from "../lib/fixtures";
import { localize } from "../lib/testUtils";
import { expectInvitationEmailToBeReceived } from "./expects";

test.describe.configure({ mode: "parallel" });

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});
/* eslint-disable playwright/no-skipped-test */
test.skip("[EE feature] Team", () => {
  test("Invitation (verified)", async ({ browser, page, users, emails }) => {
    const t = await localize("en");
    const teamOwner = await users.create({ name: `team-owner-${Date.now()}` }, { hasTeam: true });
    const { team } = await teamOwner.getFirstTeamMembership();
    await teamOwner.apiLogin();
    await page.goto(`/settings/teams/${team.id}/members`);

    await test.step("To the organization by email (internal user)", async () => {
      const invitedUserEmail = users.trackEmail({
        username: "rick",
        domain: `example.com`,
      });
      await page.getByTestId("new-member-button").click();
      await page.locator('input[name="inviteUser"]').fill(invitedUserEmail);
      await page.locator(`button:text("${t("send_invite")}")`).click();
      await expectInvitationEmailToBeReceived(
        page,
        emails,
        invitedUserEmail,
        `${teamOwner.name} invited you to join the team ${team.name} on Cal.com`
      );

      await expect(
        page.locator(`[data-testid="email-${invitedUserEmail.replace("@", "")}-pending"]`)
      ).toHaveCount(1);
    });
  });

  test("Invited member is assigned to existing event, after invitation is accepted", async ({
    page,
    users,
  }) => {
    const t = await localize("en");
    const teamEventSlugAndTitle = "event-test";
    const teamMatesObj = [{ name: "teammate-1" }, { name: "teammate-2" }];
    const teamOwner = await users.create(
      { name: `team-owner-${Date.now()}` },
      {
        hasTeam: true,
        teamRole: MembershipRole.ADMIN,
        teammates: teamMatesObj,
        schedulingType: SchedulingType.COLLECTIVE,
        teamEventSlug: teamEventSlugAndTitle,
        teamEventTitle: teamEventSlugAndTitle,
        teamEventLength: 30,
        assignAllTeamMembers: true,
      }
    );
    const invitedMember = await users.create({
      name: `invited-member-${Date.now()}`,
      email: `invited-member-${Date.now()}@example.com`,
    });
    const { team } = await teamOwner.getFirstTeamMembership();

    await teamOwner.apiLogin();
    await page.goto(`/settings/teams/${team.id}/members`);
    await page.getByTestId("new-member-button").click();
    await page.locator('input[name="inviteUser"]').fill(invitedMember.email);
    await page.locator(`button:text("${t("send_invite")}")`).click();

    await invitedMember.apiLogin();
    await page.goto(`/teams`);
    await page.getByTestId(`accept-invitation-${team.id}`).click();
    const response = await page.waitForResponse("/api/trpc/teams/acceptOrLeave?batch=1");
    expect(response.status()).toBe(200);
    await page.goto(`/event-types`);

    //ensure event-type is created for the invited member
    await expect(page.locator(`text="${teamEventSlugAndTitle}"`)).toBeVisible();

    //ensure the new event-type created for invited member is child of team event-type
    const parentEventType = await prisma.eventType.findFirst({
      where: {
        slug: teamEventSlugAndTitle,
        teamId: team.id,
      },
      select: {
        children: true,
      },
    });
    expect(parentEventType?.children.find((et) => et.userId === invitedMember.id)).toBeTruthy();
  });
});
