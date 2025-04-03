/**
 * These tests are integration tests that test the flow from receiving a api/book/event request and then verifying
 * - database entries created in In-MEMORY DB using prismock
 * - emails sent by checking the testEmails global variable
 * - webhooks fired by mocking fetch
 * - APIs of various apps called by mocking those apps' modules
 *
 * They don't intend to test what the apps logic should do, but rather test if the apps are called with the correct data. For testing that, once should write tests within each app.
 */
import {
  createBookingScenario,
  getDate,
  getGoogleCalendarCredential,
  getAppleCalendarCredential,
  TestData,
  getOrganizer,
  getBooker,
  getScenarioData,
  BookingLocations,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { createMockNextJsRequest } from "@calcom/web/test/utils/bookingScenario/createMockNextJsRequest";
import {
  expectWorkflowToBeTriggered,
  expectWorkflowToBeNotTriggered,
  expectSuccessfulBookingCreationEmails,
  expectBookingToBeInDatabase,
  expectBookingRequestedEmails,
  expectBookingRequestedWebhookToHaveBeenFired,
  expectBookingCreatedWebhookToHaveBeenFired,
  expectICalUIDAsString,
} from "@calcom/web/test/utils/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";
import { testWithAndWithoutOrg } from "@calcom/web/test/utils/bookingScenario/test";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { describe, expect } from "vitest";

import { WEBSITE_URL, WEBAPP_URL } from "@calcom/lib/constants";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

export type CustomNextApiRequest = NextApiRequest & Request;

export type CustomNextApiResponse = NextApiResponse & Response;
// Local test runs sometime gets too slow
const timeout = process.env.CI ? 5000 : 20000;

describe("handleNewBooking", () => {
  setupAndTeardown();

  describe("Fresh/New Booking:", () => {
    testWithAndWithoutOrg(
      `should create a successful booking with Cal Video(Daily Video) if no explicit location is provided
          1. Should create a booking in the database
          2. Should send emails to the booker as well as organizer
          3. Should create a booking in the event's destination calendar
          4. Should trigger BOOKING_CREATED webhook
    `,
      async ({ emails, org }) => {
        const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizerOtherEmail = "organizer2@example.com";
        const organizerDestinationCalendarEmailOnEventType = "organizerEventTypeEmail@example.com";

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],

          destinationCalendar: {
            integration: "google_calendar",
            externalId: "organizer@google-calendar.com",
            primaryEmail: organizerOtherEmail,
          },
        });

        await createBookingScenario(
          getScenarioData(
            {
              webhooks: [
                {
                  userId: organizer.id,
                  eventTriggers: ["BOOKING_CREATED"],
                  subscriberUrl: "http://my-webhook.example.com",
                  active: true,
                  eventTypeId: 1,
                  appId: null,
                },
              ],
              workflows: [
                {
                  userId: organizer.id,
                  trigger: "NEW_EVENT",
                  action: "EMAIL_HOST",
                  template: "REMINDER",
                  activeOn: [1],
                },
              ],
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 30,
                  length: 30,
                  useEventTypeDestinationCalendarEmail: true,
                  users: [
                    {
                      id: 101,
                    },
                  ],
                  destinationCalendar: {
                    integration: "google_calendar",
                    externalId: "event-type-1@google-calendar.com",
                    primaryEmail: organizerDestinationCalendarEmailOnEventType,
                  },
                },
              ],
              organizer,
            },
            org?.organization
          )
        );

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            user: organizer.username,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
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

        expectWorkflowToBeTriggered({
          emailsToReceive: [organizerDestinationCalendarEmailOnEventType],
          emails,
        });

        const iCalUID = expectICalUIDAsString(createdBooking.iCalUID);

        expectSuccessfulBookingCreationEmails({
          booking: {
            uid: createdBooking.uid!,
            urlOrigin: org ? org.urlOrigin : WEBSITE_URL,
          },
          booker,
          organizer,
          emails,
          iCalUID,
          destinationEmail: organizerDestinationCalendarEmailOnEventType,
        });

        expectBookingCreatedWebhookToHaveBeenFired({
          booker,
          organizer,
          location: BookingLocations.CalVideo,
          subscriberUrl: "http://my-webhook.example.com",
          videoCallUrl: `${WEBAPP_URL}/video/${createdBooking.uid}`,
        });
      },
      timeout
    );

    describe("Calendar events should be created in the appropriate calendar", () => {
      test(
        `should create a successful booking in the first connected calendar i.e. using the first credential(in the scenario when there is no event-type or organizer destination calendar)
          1. Should create a booking in the database
          2. Should send emails to the booker as well as organizer
          3. Should fallback to creating the booking in the first connected Calendar when neither event nor organizer has a destination calendar - This doesn't practically happen because organizer is always required to have a schedule set
          3. Should trigger BOOKING_CREATED webhook
    `,
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const organizer = getOrganizer({
            name: "Organizer",
            email: "organizer@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
          });

          await createBookingScenario(
            getScenarioData({
              webhooks: [
                {
                  userId: organizer.id,
                  eventTriggers: ["BOOKING_CREATED"],
                  subscriberUrl: "http://my-webhook.example.com",
                  active: true,
                  eventTypeId: 1,
                  appId: null,
                },
              ],
              workflows: [
                {
                  userId: organizer.id,
                  trigger: "NEW_EVENT",
                  action: "EMAIL_HOST",
                  template: "REMINDER",
                  activeOn: [1],
                },
              ],
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 30,
                  length: 30,
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

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
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

          expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });

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
          expectBookingCreatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.CalVideo,
            subscriberUrl: "http://my-webhook.example.com",
            videoCallUrl: `${WEBAPP_URL}/video/${createdBooking.uid}`,
          });
        },
        timeout
      );

      test(
        `should create a successful booking in the organizer calendar(in the scenario when event type doesn't have destination calendar)
          1. Should create a booking in the database
          2. Should send emails to the booker as well as organizer
          3. Should fallback to create a booking in the Organizer Calendar if event doesn't have destination calendar
          3. Should trigger BOOKING_CREATED webhook
    `,
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const organizer = getOrganizer({
            name: "Organizer",
            email: "organizer@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],

            destinationCalendar: {
              integration: "google_calendar",
              externalId: "organizer@google-calendar.com",
            },
          });
          await createBookingScenario(
            getScenarioData({
              webhooks: [
                {
                  userId: organizer.id,
                  eventTriggers: ["BOOKING_CREATED"],
                  subscriberUrl: "http://my-webhook.example.com",
                  active: true,
                  eventTypeId: 1,
                  appId: null,
                },
              ],
              workflows: [
                {
                  userId: organizer.id,
                  trigger: "NEW_EVENT",
                  action: "EMAIL_HOST",
                  template: "REMINDER",
                  activeOn: [1],
                },
              ],
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 30,
                  length: 30,
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

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
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

          expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });

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

          expectBookingCreatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.CalVideo,
            subscriberUrl: "http://my-webhook.example.com",
            videoCallUrl: `${WEBAPP_URL}/video/${createdBooking.uid}`,
          });
        },
        timeout
      );

      test(
        `an error in creating a calendar event should not stop the booking creation - Current behaviour is wrong as the booking is created but no-one is notified of it`,
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const organizer = getOrganizer({
            name: "Organizer",
            email: "organizer@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],

            destinationCalendar: {
              integration: "google_calendar",
              externalId: "organizer@google-calendar.com",
            },
          });
          await createBookingScenario(
            getScenarioData({
              webhooks: [
                {
                  userId: organizer.id,
                  eventTriggers: ["BOOKING_CREATED"],
                  subscriberUrl: "http://my-webhook.example.com",
                  active: true,
                  eventTypeId: 1,
                  appId: null,
                },
              ],
              workflows: [
                {
                  userId: organizer.id,
                  trigger: "NEW_EVENT",
                  action: "EMAIL_HOST",
                  template: "REMINDER",
                  activeOn: [1],
                },
              ],
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 30,
                  length: 30,
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

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: "New York" },
              },
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
              location: "New York",
            })
          );

          await expectBookingToBeInDatabase({
            description: "",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            uid: createdBooking.uid!,
            eventTypeId: mockBookingData.eventTypeId,
            status: BookingStatus.ACCEPTED,
          });

          expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });

          // FIXME: We should send Broken Integration emails on calendar event creation failure
          // expectCalendarEventCreationFailureEmails({ booker, organizer, emails });

          expectBookingCreatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: "New York",
            subscriberUrl: "http://my-webhook.example.com",
          });
        },
        timeout
      );

      test(
        "If destination calendar has no credential ID due to some reason, it should create the event in first connected calendar instead",
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const organizer = getOrganizer({
            name: "Organizer",
            email: "organizer@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],

            destinationCalendar: {
              integration: "google_calendar",
              externalId: "organizer@google-calendar.com",
            },
          });

          await createBookingScenario(
            getScenarioData({
              webhooks: [
                {
                  userId: organizer.id,
                  eventTriggers: ["BOOKING_CREATED"],
                  subscriberUrl: "http://my-webhook.example.com",
                  active: true,
                  eventTypeId: 1,
                  appId: null,
                },
              ],
              workflows: [
                {
                  userId: organizer.id,
                  trigger: "NEW_EVENT",
                  action: "EMAIL_HOST",
                  template: "REMINDER",
                  activeOn: [1],
                },
              ],
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 30,
                  length: 30,
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

          // await prismaMock.destinationCalendar.update({
          //   where: {
          //     userId: organizer.id,
          //   },
          //   data: {
          //     credentialId: null,
          //   },
          // });

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
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

          expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });

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

          expectBookingCreatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.CalVideo,
            subscriberUrl: "http://my-webhook.example.com",
            videoCallUrl: `${WEBAPP_URL}/video/${createdBooking.uid}`,
          });
        },
        timeout
      );

      test(
        "If destination calendar is there for Google Calendar but there are no Google Calendar credentials but there is an Apple Calendar credential connected, it should create the event in Apple Calendar",
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const organizer = getOrganizer({
            name: "Organizer",
            email: "organizer@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getAppleCalendarCredential()],

            destinationCalendar: {
              integration: "google_calendar",
              externalId: "organizer@google-calendar.com",
            },
          });

          await createBookingScenario(
            getScenarioData({
              webhooks: [
                {
                  userId: organizer.id,
                  eventTriggers: ["BOOKING_CREATED"],
                  subscriberUrl: "http://my-webhook.example.com",
                  active: true,
                  eventTypeId: 1,
                  appId: null,
                },
              ],
              workflows: [
                {
                  userId: organizer.id,
                  trigger: "NEW_EVENT",
                  action: "EMAIL_HOST",
                  template: "REMINDER",
                  activeOn: [1],
                },
              ],
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 30,
                  length: 30,
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

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
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
          });

          expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });

          expectSuccessfulBookingCreationEmails({
            booking: {
              uid: createdBooking.uid!,
            },
            booker,
            organizer,
            emails,
            iCalUID: createdBooking.iCalUID ?? "",
          });

          expectBookingCreatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.CalVideo,
            subscriberUrl: "http://my-webhook.example.com",
            videoCallUrl: `${WEBAPP_URL}/video/${createdBooking.uid}`,
          });
        },
        timeout
      );
    });

    describe("Event length check during booking", () => {
      test(
        `should fail if the time difference between a booking's start and end times is not equal to the event length.`,
        async () => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;

          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const organizer = getOrganizer({
            name: "Organizer",
            email: "organizer@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
          });

          await createBookingScenario(
            getScenarioData({
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 30,
                  length: 30,
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

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              start: `${getDate({ dateIncrement: 1 }).dateString}T05:00:00.000Z`,
              end: `${getDate({ dateIncrement: 1 }).dateString}T05:15:00.000Z`,
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: "New York" },
              },
            },
          });

          const { req } = createMockNextJsRequest({
            method: "POST",
            body: mockBookingData,
          });

          await expect(async () => await handleNewBooking(req)).rejects.toThrowError("Invalid event length");
        },
        timeout
      );
    });

    describe(
      "Availability Check during booking",
      () => {
        test(
          `should fail a booking if there is already a Cal.com booking overlapping the time`,
          async ({}) => {
            const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;

            const booker = getBooker({
              email: "booker@example.com",
              name: "Booker",
            });

            const organizer = getOrganizer({
              name: "Organizer",
              email: "organizer@example.com",
              id: 101,
              schedules: [TestData.schedules.IstWorkHours],
              // credentials: [getGoogleCalendarCredential()],
              //
            });

            const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
            const uidOfOverlappingBooking = "harWv3eHgconAED2j4gcVhP";
            await createBookingScenario(
              getScenarioData({
                eventTypes: [
                  {
                    id: 1,
                    slotInterval: 30,
                    length: 30,
                    users: [
                      {
                        id: 101,
                      },
                    ],
                  },
                ],
                bookings: [
                  {
                    uid: uidOfOverlappingBooking,
                    eventTypeId: 1,
                    userId: 101,
                    status: BookingStatus.ACCEPTED,
                    startTime: `${plus1DateString}T05:00:00.000Z`,
                    endTime: `${plus1DateString}T05:30:00.000Z`,
                  },
                ],
                organizer,
              })
            );

            const mockBookingData = getMockRequestDataForBooking({
              data: {
                start: `${getDate({ dateIncrement: 1 }).dateString}T05:00:00.000Z`,
                end: `${getDate({ dateIncrement: 1 }).dateString}T05:30:00.000Z`,
                eventTypeId: 1,
                responses: {
                  email: booker.email,
                  name: booker.name,
                  location: { optionValue: "", value: "New York" },
                },
              },
            });

            const { req } = createMockNextJsRequest({
              method: "POST",
              body: mockBookingData,
            });

            await expect(async () => await handleNewBooking(req)).rejects.toThrowError(
              ErrorCode.NoAvailableUsersFound
            );
          },
          timeout
        );
      },
      timeout
    );

    describe("Event Type that requires confirmation", () => {
      test(
        `should create a booking request for event that requires confirmation
            1. Should create a booking in the database with status PENDING
            2. Should send emails to the booker as well as organizer for booking request and awaiting approval
            3. Should trigger BOOKING_REQUESTED webhook
    `,
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const subscriberUrl = "http://my-webhook.example.com";
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const organizer = getOrganizer({
            name: "Organizer",
            email: "organizer@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
          });
          const scenarioData = getScenarioData({
            webhooks: [
              {
                userId: organizer.id,
                eventTriggers: ["BOOKING_CREATED"],
                subscriberUrl,
                active: true,
                eventTypeId: 1,
                appId: null,
              },
            ],
            workflows: [
              {
                userId: organizer.id,
                trigger: "NEW_EVENT",
                action: "EMAIL_HOST",
                template: "REMINDER",
                activeOn: [1],
              },
            ],
            eventTypes: [
              {
                id: 1,
                slotInterval: 30,
                requiresConfirmation: true,
                length: 30,
                users: [
                  {
                    id: 101,
                  },
                ],
              },
            ],
            organizer,
          });
          await createBookingScenario(scenarioData);

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
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
            status: BookingStatus.PENDING,
          });

          expectWorkflowToBeNotTriggered({ emailsToReceive: [organizer.email], emails });

          expectBookingRequestedEmails({
            booker,
            organizer,
            emails,
          });

          expectBookingRequestedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.CalVideo,
            subscriberUrl,
            eventType: scenarioData.eventTypes[0],
          });
        },
        timeout
      );

      /**
       * NOTE: We might want to think about making the bookings get ACCEPTED automatically if the booker is the organizer of the event-type. This is a design decision it seems for now.
       */
      test(
        `should make a fresh booking in PENDING state even when the booker is the organizer of the event-type
        1. Should create a booking in the database with status PENDING
        2. Should send emails to the booker as well as organizer for booking request and awaiting approval
        3. Should trigger BOOKING_REQUESTED webhook
    `,
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const subscriberUrl = "http://my-webhook.example.com";
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const organizer = getOrganizer({
            name: "Organizer",
            email: "organizer@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
          });
          const scenarioData = getScenarioData({
            webhooks: [
              {
                userId: organizer.id,
                eventTriggers: ["BOOKING_CREATED"],
                subscriberUrl,
                active: true,
                eventTypeId: 1,
                appId: null,
              },
            ],
            workflows: [
              {
                userId: organizer.id,
                trigger: "NEW_EVENT",
                action: "EMAIL_HOST",
                template: "REMINDER",
                activeOn: [1],
              },
            ],
            eventTypes: [
              {
                id: 1,
                slotInterval: 30,
                requiresConfirmation: true,
                length: 30,
                users: [
                  {
                    id: 101,
                  },
                ],
              },
            ],
            organizer,
          });
          await createBookingScenario(scenarioData);

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
            },
          });

          const { req } = createMockNextJsRequest({
            method: "POST",
            body: mockBookingData,
          });

          req.userId = organizer.id;

          const createdBooking = await handleNewBooking(req);

          await expectBookingToBeInDatabase({
            description: "",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            uid: createdBooking.uid!,
            eventTypeId: mockBookingData.eventTypeId,
            status: BookingStatus.PENDING,
            location: BookingLocations.CalVideo,
            responses: expect.objectContaining({
              email: booker.email,
              name: booker.name,
            }),
          });

          expectWorkflowToBeNotTriggered({ emailsToReceive: [organizer.email], emails });

          expectBookingRequestedEmails({
            booker,
            organizer,
            emails,
          });

          expectBookingRequestedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.CalVideo,
            subscriberUrl,
            eventType: scenarioData.eventTypes[0],
          });
        },
        timeout
      );

      test(
        `should create a booking for event that requires confirmation based on a booking notice duration threshold, if threshold is not met
            1. Should create a booking in the database with status ACCEPTED
            2. Should send emails to the booker as well as organizer
            3. Should trigger BOOKING_CREATED webhook
    `,
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });
          const subscriberUrl = "http://my-webhook.example.com";

          const organizer = getOrganizer({
            name: "Organizer",
            email: "organizer@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
          });

          await createBookingScenario(
            getScenarioData({
              webhooks: [
                {
                  userId: organizer.id,
                  eventTriggers: ["BOOKING_CREATED"],
                  subscriberUrl,
                  active: true,
                  eventTypeId: 1,
                  appId: null,
                },
              ],
              workflows: [
                {
                  userId: organizer.id,
                  trigger: "NEW_EVENT",
                  action: "EMAIL_HOST",
                  template: "REMINDER",
                  activeOn: [1],
                },
              ],
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 30,
                  requiresConfirmation: true,
                  metadata: {
                    requiresConfirmationThreshold: {
                      time: 30,
                      unit: "minutes",
                    },
                  },
                  length: 30,
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

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
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

          expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });

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

          expectBookingCreatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.CalVideo,
            subscriberUrl,
            videoCallUrl: `${WEBAPP_URL}/video/${createdBooking.uid}`,
          });
        },
        timeout
      );

      test(
        `should create a booking for event that requires confirmation based on a booking notice duration threshold, if threshold IS MET
            1. Should create a booking in the database with status PENDING
            2. Should send emails to the booker as well as organizer for booking request and awaiting approval
            3. Should trigger BOOKING_REQUESTED webhook
    `,
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const subscriberUrl = "http://my-webhook.example.com";
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const organizer = getOrganizer({
            name: "Organizer",
            email: "organizer@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
          });
          const scenarioData = getScenarioData({
            webhooks: [
              {
                userId: organizer.id,
                eventTriggers: ["BOOKING_CREATED"],
                subscriberUrl,
                active: true,
                eventTypeId: 1,
                appId: null,
              },
            ],
            workflows: [
              {
                userId: organizer.id,
                trigger: "NEW_EVENT",
                action: "EMAIL_HOST",
                template: "REMINDER",
                activeOn: [1],
              },
            ],
            eventTypes: [
              {
                id: 1,
                slotInterval: 30,
                requiresConfirmation: true,
                metadata: {
                  requiresConfirmationThreshold: {
                    time: 120,
                    unit: "hours",
                  },
                },
                length: 30,
                users: [
                  {
                    id: 101,
                  },
                ],
              },
            ],
            organizer,
          });

          await createBookingScenario(scenarioData);

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
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
            status: BookingStatus.PENDING,
            iCalUID: createdBooking.iCalUID,
          });

          expectWorkflowToBeNotTriggered({ emailsToReceive: [organizer.email], emails });

          expectBookingRequestedEmails({ booker, organizer, emails });

          expectBookingRequestedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.CalVideo,
            subscriberUrl,
            eventType: scenarioData.eventTypes[0],
          });
        },
        timeout
      );
    });

    // FIXME: We shouldn't throw error here, the behaviour should be fixed.

    test(
      `should create a successful booking when location is provided as label of an option(Done for Organizer Address)
      1. Should create a booking in the database
      2. Should send emails to the booker as well as organizer
      3. Should trigger BOOKING_CREATED webhook
    `,
      async ({ emails }) => {
        const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            user: organizer.username,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const { req } = createMockNextJsRequest({
          method: "POST",
          body: mockBookingData,
        });

        const scenarioData = getScenarioData({
          webhooks: [
            {
              userId: organizer.id,
              eventTriggers: ["BOOKING_CREATED"],
              subscriberUrl: "http://my-webhook.example.com",
              active: true,
              eventTypeId: 1,
              appId: null,
            },
          ],
          workflows: [
            {
              userId: organizer.id,
              trigger: "NEW_EVENT",
              action: "EMAIL_HOST",
              template: "REMINDER",
              activeOn: [1],
            },
          ],
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              users: [
                {
                  id: 101,
                },
              ],
            },
          ],
          organizer,
        });

        await createBookingScenario(scenarioData);

        const createdBooking = await handleNewBooking(req);
        expect(createdBooking.responses).toEqual(
          expect.objectContaining({
            email: booker.email,
            name: booker.name,
          })
        );

        expect(createdBooking).toEqual(
          expect.objectContaining({
            location: "New York",
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

        expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });

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
        expectBookingCreatedWebhookToHaveBeenFired({
          booker,
          organizer,
          location: "New York",
          subscriberUrl: "http://my-webhook.example.com",
        });
      },
      timeout
    );
  });

  test.todo("CRM calendar events creation verification");
});
