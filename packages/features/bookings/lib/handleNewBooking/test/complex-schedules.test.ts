import {
  createBookingScenario,
  getGoogleCalendarCredential,
  getDate,
  getOrganizer,
  getBooker,
  getScenarioData,
  BookingLocations,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { createMockNextJsRequest } from "@calcom/web/test/utils/bookingScenario/createMockNextJsRequest";
import {
  expectSuccessfulBookingCreationEmails,
  expectBookingToBeInDatabase,
  expectICalUIDAsString,
} from "@calcom/web/test/utils/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { describe, expect } from "vitest";

import dayjs from "@calcom/dayjs";
import { BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

export const Timezones = {
  "-05:00": "America/New_York",
  "00:00": "Europe/London",
};

export type CustomNextApiRequest = NextApiRequest & Request;

export type CustomNextApiResponse = NextApiResponse & Response;
// Local test runs sometime gets too slow
const timeout = process.env.CI ? 5000 : 20000;

describe("handleNewBooking", () => {
  setupAndTeardown();

  describe("Complex schedules:", () => {
    test(
      `should be able to book the last slot before midnight`,
      async ({ emails }) => {
        const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
        const newYorkTimeZone = Timezones["-05:00"];
        const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        // Using .endOf("day") here to ensure our date doesn't change when we set the time zone
        const startDateTimeOrganizerTz = dayjs(plus1DateString)
          .endOf("day")
          .tz(newYorkTimeZone)
          .hour(23)
          .minute(0)
          .second(0);

        const endDateTimeOrganizerTz = dayjs(plus1DateString)
          .endOf("day")
          .tz(newYorkTimeZone)
          .startOf("day")
          .add(1, "day");

        const schedule = {
          name: "4:00PM to 11:59PM in New York",
          availability: [
            {
              days: [0, 1, 2, 3, 4, 5, 6],
              startTime: dayjs("1970-01-01").utc().hour(16).toDate(), // These times are stored with Z offset
              endTime: dayjs("1970-01-01").utc().hour(23).minute(59).toDate(), // These times are stored with Z offset
              date: null,
            },
          ],
          timeZone: newYorkTimeZone,
        };

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [schedule],
          credentials: [getGoogleCalendarCredential()],
        });

        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: 60,
                length: 60,
                users: [
                  {
                    id: 101,
                  },
                ],
              },
            ],
            organizer,
          })
        );

        // Mock a Scenario where iCalUID isn't returned by Google Calendar in which case booking UID is used as the ics UID

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            start: startDateTimeOrganizerTz.format(),
            end: endDateTimeOrganizerTz.format(),
            timeZone: Timezones["-05:00"],
          },
        });

        const { req } = createMockNextJsRequest({
          method: "POST",
          body: mockBookingData,
        });

        const createdBooking = await handleNewBooking(req);
        expect(createdBooking.responses).toEqual(
          expect.objectContaining({
            email: booker.email,
            name: booker.name,
          })
        );

        expect(createdBooking).toEqual(
          expect.objectContaining({
            location: BookingLocations.CalVideo,
          })
        );

        await expectBookingToBeInDatabase({
          description: "",
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          uid: createdBooking.uid!,
          eventTypeId: mockBookingData.eventTypeId,
          status: BookingStatus.ACCEPTED,
          iCalUID: createdBooking.iCalUID,
        });

        const iCalUID = expectICalUIDAsString(createdBooking.iCalUID);

        expectSuccessfulBookingCreationEmails({
          booking: {
            uid: createdBooking.uid!,
          },
          booker,
          organizer,
          emails,
          iCalUID,
        });
      },
      timeout
    );
  });
});
