import { expect } from "@playwright/test";

import { SchedulingType } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

const title = (name: string) => `${name} is unpublished`;
const description = (entity: string) =>
  `This ${entity} link is currently not available. Please contact the ${entity} owner or ask them to publish it.`;

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

test.describe("Unpublished", () => {
  test("Regular team profile", async ({ page, users }) => {
    const owner = await users.create(undefined, { hasTeam: true, isUnpublished: true });
    const { team } = await owner.getFirstTeamMembership();
    const { requestedSlug } = team.metadata as { requestedSlug: string };
    await page.goto(`/team/${requestedSlug}`);
    await expect(page.locator('[data-testid="empty-screen"]')).toHaveCount(1);
    await expect(page.locator(`h2:has-text("${title(team.name)}")`)).toHaveCount(1);
    await expect(page.locator(`div:text("${description("team")}")`)).toHaveCount(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", /.*/);
  });

  test("Regular team event type", async ({ page, users }) => {
    const owner = await users.create(undefined, {
      hasTeam: true,
      isUnpublished: true,
      schedulingType: SchedulingType.COLLECTIVE,
    });
    const { team } = await owner.getFirstTeamMembership();
    const { requestedSlug } = team.metadata as { requestedSlug: string };
    const { slug: teamEventSlug } = await owner.getFirstTeamEvent(team.id);
    await page.goto(`/team/${requestedSlug}/${teamEventSlug}`);
    await expect(page.locator('[data-testid="empty-screen"]')).toHaveCount(1);
    await expect(page.locator(`h2:has-text("${title(team.name)}")`)).toHaveCount(1);
    await expect(page.locator(`div:text("${description("team")}")`)).toHaveCount(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", /.*/);
  });
});
