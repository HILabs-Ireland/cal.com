import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";
import {
  confirmReschedule,
  doOnOrgDomain,
  goToUrlWithErrorHandling,
  selectFirstAvailableTimeSlotNextMonth,
} from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Reschedule Tests", async () => {
  test("Should do a booking request reschedule from /bookings", async ({ page, users, bookings }) => {
    const user = await users.create();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const booking = await bookings.create(user.id, user.username, user.eventTypes[0].id!, {
      status: BookingStatus.ACCEPTED,
    });

    await user.apiLogin();
    await page.goto("/bookings/upcoming");

    await page.locator('[data-testid="edit_booking"]').nth(0).click();

    await page.locator('[data-testid="reschedule_request"]').click();

    await page.fill('[data-testid="reschedule_reason"]', "I can't longer have it");

    await page.locator('button[data-testid="send_request"]').click();
    await expect(page.locator('[id="modal-title"]')).toBeHidden();

    const updatedBooking = await booking.self();

    expect(updatedBooking?.rescheduled).toBe(true);
    expect(updatedBooking?.cancellationReason).toBe("I can't longer have it");
    expect(updatedBooking?.status).toBe(BookingStatus.CANCELLED);
    await booking.delete();
  });

  test("Should display former time when rescheduling availability", async ({ page, users, bookings }) => {
    const user = await users.create();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const booking = await bookings.create(user.id, user.username, user.eventTypes[0].id!, {
      status: BookingStatus.ACCEPTED,
      rescheduled: true,
    });

    await page.goto(`/reschedule/${booking.uid}`);

    await selectFirstAvailableTimeSlotNextMonth(page);

    const formerTimeElement = page.locator('[data-testid="former_time_p"]');
    await expect(formerTimeElement).toBeVisible();
    await booking.delete();
  });

  test("Should display request reschedule send on bookings/cancelled", async ({ page, users, bookings }) => {
    const user = await users.create();
    const booking = await bookings.create(user.id, user.username, user.eventTypes[0].id, {
      status: BookingStatus.CANCELLED,
      rescheduled: true,
    });

    await user.apiLogin();
    await page.goto("/bookings/cancelled");

    const requestRescheduleSentElement = page.locator('[data-testid="request_reschedule_sent"]').nth(1);
    await expect(requestRescheduleSentElement).toBeVisible();
    await booking.delete();
  });

  test("Should do a reschedule from user owner", async ({ page, users, bookings }) => {
    const user = await users.create();
    const [eventType] = user.eventTypes;
    const booking = await bookings.create(user.id, user.username, eventType.id, {
      status: BookingStatus.ACCEPTED,
      rescheduled: true,
    });

    await page.goto(`/reschedule/${booking.uid}`);

    await selectFirstAvailableTimeSlotNextMonth(page);

    await expect(page.locator('[name="name"]')).toBeDisabled();
    await expect(page.locator('[name="email"]')).toBeDisabled();
    await confirmReschedule(page);
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    const newBooking = await prisma.booking.findFirstOrThrow({ where: { fromReschedule: booking.uid } });
    const rescheduledBooking = await prisma.booking.findFirstOrThrow({ where: { uid: booking.uid } });

    expect(newBooking).not.toBeNull();
    expect(rescheduledBooking.status).toBe(BookingStatus.CANCELLED);

    await prisma.booking.deleteMany({
      where: {
        id: {
          in: [newBooking.id, rescheduledBooking.id],
        },
      },
    });
  });

  // eslint-disable-next-line playwright/no-skipped-test
  test.skip("[EE feature] Opt in event should be PENDING when rescheduled by USER", async ({
    page,
    users,
    bookings,
  }) => {
    const user = await users.create();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const eventType = user.eventTypes.find((e) => e.slug === "opt-in")!;
    const booking = await bookings.create(user.id, user.username, eventType.id, {
      status: BookingStatus.ACCEPTED,
    });

    await page.goto(`/reschedule/${booking.uid}`);

    await selectFirstAvailableTimeSlotNextMonth(page);

    await confirmReschedule(page);

    await expect(page).toHaveURL(/.*booking/);

    const newBooking = await prisma.booking.findFirstOrThrow({ where: { fromReschedule: booking?.uid } });
    expect(newBooking).not.toBeNull();
    expect(newBooking.status).toBe(BookingStatus.PENDING);
  });

  test("Opt in event should be ACCEPTED when rescheduled by OWNER", async ({ page, users, bookings }) => {
    const user = await users.create();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const eventType = user.eventTypes.find((e) => e.slug === "opt-in")!;
    const booking = await bookings.create(user.id, user.username, eventType.id, {
      status: BookingStatus.ACCEPTED,
    });
    await user.apiLogin();

    await page.goto(`/reschedule/${booking.uid}`);

    await selectFirstAvailableTimeSlotNextMonth(page);

    await confirmReschedule(page);

    await expect(page).toHaveURL(/.*booking/);

    const newBooking = await prisma.booking.findFirstOrThrow({ where: { fromReschedule: booking?.uid } });
    expect(newBooking).not.toBeNull();
    expect(newBooking.status).toBe(BookingStatus.ACCEPTED);
  });

  test("Attendee should be able to reschedule a booking", async ({ page, users, bookings }) => {
    const user = await users.create();
    const eventType = user.eventTypes[0];
    const booking = await bookings.create(user.id, user.username, eventType.id);

    // Go to attendee's reschedule link
    await page.goto(`/reschedule/${booking.uid}`);

    await selectFirstAvailableTimeSlotNextMonth(page);

    await confirmReschedule(page);

    await expect(page).toHaveURL(/.*booking/);

    const newBooking = await prisma.booking.findFirstOrThrow({ where: { fromReschedule: booking?.uid } });
    expect(newBooking).not.toBeNull();
    expect(newBooking.status).toBe(BookingStatus.ACCEPTED);
  });

  test("Should be able to book slot that overlaps with original rescheduled booking", async ({
    page,
    users,
    bookings,
  }) => {
    const user = await users.create();
    const eventType = user.eventTypes[0];

    let firstOfNextMonth = dayjs().add(1, "month").startOf("month");

    // find first available slot of next month (available monday-friday)
    // eslint-disable-next-line playwright/no-conditional-in-test
    while (firstOfNextMonth.day() < 1 || firstOfNextMonth.day() > 5) {
      firstOfNextMonth = firstOfNextMonth.add(1, "day");
    }

    // set startTime to first available slot
    const startTime = firstOfNextMonth.set("hour", 9).set("minute", 0).toDate();
    const endTime = firstOfNextMonth.set("hour", 9).set("minute", 30).toDate();

    const booking = await bookings.create(user.id, user.username, eventType.id, {}, startTime, endTime);

    await page.goto(`/reschedule/${booking.uid}`);

    await selectFirstAvailableTimeSlotNextMonth(page);

    await confirmReschedule(page);
    await expect(page).toHaveURL(/.*booking/);
  });

  test("Should be able to a dynamic group booking", async () => {
    // It is tested in dynamic-booking-pages.e2e.ts
  });

  test("Team Event Booking", () => {
    // It is tested in teams.e2e.ts
  });
  /* eslint-disable playwright/no-skipped-test */
  test.skip("[EE feature] Organization", () => {
    test("Booking should be rescheduleable for a user that was moved to an organization through org domain", async ({
      users,
      bookings,
      orgs,
      page,
    }) => {
      const org = await orgs.create({
        name: "TestOrg",
      });
      const orgMember = await users.create({
        username: "username-outside-org",
        organizationId: org.id,
        profileUsername: "username-inside-org",
        roleInOrganization: MembershipRole.MEMBER,
      });
      const profileUsername = (await orgMember.getFirstProfile()).username;
      const eventType = orgMember.eventTypes[0];
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const orgSlug = org.slug!;
      const booking = await bookings.create(orgMember.id, orgMember.username, eventType.id);

      return await doOnOrgDomain(
        {
          orgSlug: orgSlug,
          page,
        },
        async ({ page, goToUrlWithErrorHandling }) => {
          const result = await goToUrlWithErrorHandling(`/reschedule/${booking.uid}`);
          expectUrlToBeABookingPageOnOrgForUsername({
            url: result.url,
            orgSlug,
            username: profileUsername,
          });

          const rescheduleUrlToBeOpenedInOrgContext = getNonOrgUrlFromOrgUrl(result.url, orgSlug);
          await page.goto(rescheduleUrlToBeOpenedInOrgContext);
          await expectSuccessfulReschedule(page, orgSlug);
          return { url: result.url };
        }
      );
    });

    test("Booking should be rescheduleable for a user that was moved to an organization through non-org domain", async ({
      users,
      bookings,
      orgs,
      page,
    }) => {
      const org = await orgs.create({
        name: "TestOrg",
      });
      const orgMember = await users.create({
        username: "username-outside-org",
        organizationId: org.id,
        profileUsername: "username-inside-org",
        roleInOrganization: MembershipRole.MEMBER,
      });
      const eventType = orgMember.eventTypes[0];
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const orgSlug = org.slug!;
      const booking = await bookings.create(orgMember.id, orgMember.username, eventType.id);

      const result = await goToUrlWithErrorHandling({ url: `/reschedule/${booking.uid}`, page });

      await doOnOrgDomain(
        {
          orgSlug: orgSlug,
          page,
        },
        async ({ page }) => {
          await page.goto(getNonOrgUrlFromOrgUrl(result.url, orgSlug));
          await expectSuccessfulReschedule(page, orgSlug);
        }
      );
    });

    const getNonOrgUrlFromOrgUrl = (url: string, orgSlug: string) => url.replace(orgSlug, "app");

    async function expectSuccessfulReschedule(page: Page, orgSlug: string) {
      await selectFirstAvailableTimeSlotNextMonth(page);
      const { protocol, host } = new URL(page.url());
      // Needed since we we're expecting a non-org URL, causing timeouts.
      const url = getNonOrgUrlFromOrgUrl(`${protocol}//${host}/api/book/event`, orgSlug);
      await confirmReschedule(page, url);
      await expect(page.locator("[data-testid=success-page]")).toBeVisible();
    }
  });
});

function expectUrlToBeABookingPageOnOrgForUsername({
  url,
  orgSlug,
  username,
}: {
  url: string;
  orgSlug: string;
  username: string;
}) {
  expect(url).toContain(`://${orgSlug}.`);
  const urlObject = new URL(url);
  const usernameInUrl = urlObject.pathname.split("/")[1];
  expect(usernameInUrl).toEqual(username);
}
