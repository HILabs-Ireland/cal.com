import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import {
  bookTimeSlot,
  confirmReschedule,
  selectFirstAvailableTimeSlotNextMonth,
  selectSecondAvailableTimeSlotNextMonth,
} from "./lib/testUtils";

test.afterEach(({ users }) => users.deleteAll());

test("dynamic booking", async ({ page, users }) => {
  const pro = await users.create();
  await pro.apiLogin();

  const free = await users.create({ username: "free.example" });
  await page.goto(`/${pro.username}+${free.username}`);

  await test.step("book an event first day in next month", async () => {
    await selectFirstAvailableTimeSlotNextMonth(page);

    // Fill what is this meeting about? title
    await page.locator('[name="title"]').fill("Test meeting");

    await bookTimeSlot(page);

    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
  });

  await test.step("can reschedule a booking", async () => {
    // Logged in
    await page.goto("/bookings/upcoming");
    await page.locator('[data-testid="edit_booking"]').nth(0).click();
    await page.locator('[data-testid="reschedule"]').click();
    await page.waitForURL((url) => {
      const bookingId = url.searchParams.get("rescheduleUid");
      return !!bookingId;
    });
    await selectSecondAvailableTimeSlotNextMonth(page);

    // No need to fill fields since they should be already filled
    await confirmReschedule(page);
    await page.waitForURL((url) => {
      return url.pathname.startsWith("/booking");
    });
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
  });

  await test.step("Can cancel the recently created booking", async () => {
    await page.goto("/bookings/upcoming");
    await page.locator('[data-testid="cancel"]').click();
    await page.waitForURL((url) => {
      return url.pathname.startsWith("/booking");
    });
    await page.locator('[data-testid="confirm_cancel"]').click();

    const cancelledHeadline = page.locator('[data-testid="cancelled-headline"]');
    await expect(cancelledHeadline).toBeVisible();
  });
});

test("dynamic booking info prefilled by query params", async ({ page, users }) => {
  const pro = await users.create();
  await pro.apiLogin();

  let duration = 15;
  const free = await users.create({ username: "free.example" });
  await page.goto(`/${pro.username}+${free.username}?duration=${duration}`);

  const listItemByDurationTestId = (duration: number) => `multiple-choice-${duration}mins`;

  let listItemLocator = await page.getByTestId(listItemByDurationTestId(duration));
  let activeState = await listItemLocator.getAttribute("data-active");

  expect(activeState).toEqual("true");

  duration = 30;
  await page.goto(`/${pro.username}+${free.username}?duration=${duration}`);
  listItemLocator = await page.getByTestId(listItemByDurationTestId(duration));
  activeState = await listItemLocator.getAttribute("data-active");

  expect(activeState).toEqual("true");

  // Check another badge just to ensure its not selected
  listItemLocator = await page.getByTestId(listItemByDurationTestId(15));
  activeState = await listItemLocator.getAttribute("data-active");
  expect(activeState).toEqual("false");
});
// eslint-disable-next-line playwright/no-skipped-test
test.skip("it contains the right event details", async ({ page }) => {
  const response = await page.goto(`http://acme.cal.local:3000/owner1+member1`);
  expect(response?.status()).toBe(200);

  await expect(page.locator('[data-testid="event-title"]')).toHaveText("Group Meeting");
  await expect(page.locator('[data-testid="event-meta"]')).toContainText("Acme Inc");

  expect((await page.locator('[data-testid="event-meta"] [data-testid="avatar"]').all()).length).toBe(3);
});
