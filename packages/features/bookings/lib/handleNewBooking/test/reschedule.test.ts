/* eslint-disable playwright/no-skipped-test */
import prismaMock from "../../../../../../tests/libs/__mocks__/prisma";

import {
  createBookingScenario,
  getDate,
  getGoogleCalendarCredential,
  getGoogleMeetCredential,
  TestData,
  getOrganizer,
  getBooker,
  getScenarioData,
  BookingLocations,
  getMockBookingAttendee,
  getDefaultBookingFields,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { createMockNextJsRequest } from "@calcom/web/test/utils/bookingScenario/createMockNextJsRequest";
import {
  expectWorkflowToBeTriggered,
  expectBookingToBeInDatabase,
  expectBookingRescheduledWebhookToHaveBeenFired,
  expectSuccessfulBookingRescheduledEmails,
  expectBookingInDBToBeRescheduledFromTo,
  expectBookingRequestedEmails,
  expectBookingRequestedWebhookToHaveBeenFired,
  expectSuccessfulRoundRobinReschedulingEmails,
} from "@calcom/web/test/utils/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, expect, beforeEach } from "vitest";

import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { resetTestSMS } from "@calcom/lib/testSMS";
import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

// Local test runs sometime gets too slow
const timeout = process.env.CI ? 5000 : 20000;

describe("handleNewBooking", () => {
  setupAndTeardown();

  beforeEach(() => {
    resetTestSMS();
  });

  describe.skip("[EE feature] Reschedule", () => {
    describe("User event-type", () => {
      test(
        `should rechedule an existing booking successfully with Cal Video(Daily Video)
          1. Should cancel the existing booking
          2. Should create a new booking in the database
          3. Should send emails to the booker as well as organizer
          4. Should trigger BOOKING_RESCHEDULED webhook
    `,
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const organizer = getOrganizer({
            name: "Organizer",
            email: "b3JnYW5pemVyQGV4YW1wbGUuY29t",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
          });

          const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
          const uidOfBookingToBeRescheduled = "n5Wv3eHgconAED2j4gcVhP";
          const iCalUID = `${uidOfBookingToBeRescheduled}@Cal.com`;
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
                  trigger: "RESCHEDULE_EVENT",
                  action: "EMAIL_HOST",
                  template: "REMINDER",
                  activeOn: [1],
                },
              ],
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 15,
                  length: 15,
                  users: [
                    {
                      id: 101,
                    },
                  ],
                },
              ],
              bookings: [
                {
                  uid: uidOfBookingToBeRescheduled,
                  eventTypeId: 1,
                  status: BookingStatus.ACCEPTED,
                  startTime: `${plus1DateString}T05:00:00.000Z`,
                  endTime: `${plus1DateString}T05:15:00.000Z`,
                  metadata: {
                    videoCallUrl: "https://existing-daily-video-call-url.example.com",
                  },
                  iCalUID,
                },
              ],
              organizer,
            })
          );

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              rescheduleUid: uidOfBookingToBeRescheduled,
              start: `${plus1DateString}T04:00:00.000Z`,
              end: `${plus1DateString}T04:15:00.000Z`,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
              rescheduledBy: organizer.email,
            },
          });

          const { req } = createMockNextJsRequest({
            method: "POST",
            body: mockBookingData,
          });

          const createdBooking = await handleNewBooking(req);

          const previousBooking = await prismaMock.booking.findUnique({
            where: {
              uid: uidOfBookingToBeRescheduled,
            },
          });

          logger.silly({
            previousBooking,
            allBookings: await prismaMock.booking.findMany(),
          });

          // Expect previous booking to be cancelled
          await expectBookingToBeInDatabase({
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            uid: uidOfBookingToBeRescheduled,
            status: BookingStatus.CANCELLED,
            rescheduledBy: organizer.email,
          });

          expect(previousBooking?.status).toBe(BookingStatus.CANCELLED);
          /**
           *  Booking Time should be new time
           */
          expect(createdBooking.startTime?.toISOString()).toBe(`${plus1DateString}T04:00:00.000Z`);
          expect(createdBooking.endTime?.toISOString()).toBe(`${plus1DateString}T04:15:00.000Z`);

          await expectBookingInDBToBeRescheduledFromTo({
            from: {
              uid: uidOfBookingToBeRescheduled,
            },
            to: {
              description: "",
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              uid: createdBooking.uid!,
              eventTypeId: mockBookingData.eventTypeId,
              status: BookingStatus.ACCEPTED,
              location: BookingLocations.CalVideo,
              responses: expect.objectContaining({
                email: booker.email,
                name: booker.name,
              }),
            },
          });
          expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });

          expectSuccessfulBookingRescheduledEmails({
            booker,
            organizer,
            emails,
            iCalUID,
          });

          expectBookingRescheduledWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.CalVideo,
            subscriberUrl: "http://my-webhook.example.com",
            videoCallUrl: `${WEBAPP_URL}/video/${createdBooking.uid}`,
            payload: {
              rescheduledBy: organizer.email,
            },
          });
        },
        timeout
      );

      test(
        `should reschedule a booking successfully and update the event in the same externalCalendarId as was used in the booking earlier.
          1. Should cancel the existing booking
          2. Should create a new booking in the database
          3. Should send emails to the booker as well as organizer
          4. Should trigger BOOKING_RESCHEDULED webhook
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

          const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
          const uidOfBookingToBeRescheduled = "n5Wv3eHgconAED2j4gcVhP";
          const iCalUID = `${uidOfBookingToBeRescheduled}@Cal.com`;
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
                  trigger: "RESCHEDULE_EVENT",
                  action: "EMAIL_HOST",
                  template: "REMINDER",
                  activeOn: [1],
                },
              ],
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 15,
                  length: 15,
                  users: [
                    {
                      id: 101,
                    },
                  ],
                  destinationCalendar: {
                    integration: "google_calendar",
                    externalId: "event-type-1@example.com",
                  },
                },
              ],
              bookings: [
                {
                  uid: uidOfBookingToBeRescheduled,
                  eventTypeId: 1,
                  status: BookingStatus.ACCEPTED,
                  startTime: `${plus1DateString}T05:00:00.000Z`,
                  endTime: `${plus1DateString}T05:15:00.000Z`,
                  iCalUID,
                },
              ],
              organizer,
            })
          );

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              rescheduleUid: uidOfBookingToBeRescheduled,
              start: `${plus1DateString}T04:00:00.000Z`,
              end: `${plus1DateString}T04:15:00.000Z`,
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

          /**
           *  Booking Time should be new time
           */
          expect(createdBooking.startTime?.toISOString()).toBe(`${plus1DateString}T04:00:00.000Z`);
          expect(createdBooking.endTime?.toISOString()).toBe(`${plus1DateString}T04:15:00.000Z`);

          await expectBookingInDBToBeRescheduledFromTo({
            from: {
              uid: uidOfBookingToBeRescheduled,
            },
            to: {
              description: "",
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              uid: createdBooking.uid!,
              eventTypeId: mockBookingData.eventTypeId,
              status: BookingStatus.ACCEPTED,
              location: BookingLocations.CalVideo,
              responses: expect.objectContaining({
                email: booker.email,
                name: booker.name,
              }),
            },
          });

          expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });

          expectSuccessfulBookingRescheduledEmails({
            booker,
            organizer,
            emails,
            iCalUID,
          });
          expectBookingRescheduledWebhookToHaveBeenFired({
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
        `an error in updating a calendar event should not stop the rescheduling - Current behaviour is wrong as the booking is resheduled but no-one is notified of it`,
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
          const uidOfBookingToBeRescheduled = "n5Wv3eHgconAED2j4gcVhP";
          const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

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
                  trigger: "RESCHEDULE_EVENT",
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
              bookings: [
                {
                  uid: uidOfBookingToBeRescheduled,
                  eventTypeId: 1,
                  status: BookingStatus.ACCEPTED,
                  startTime: `${plus1DateString}T05:00:00.000Z`,
                  endTime: `${plus1DateString}T05:30:00.000Z`,
                  metadata: {
                    videoCallUrl: "https://existing-daily-video-call-url.example.com",
                  },
                },
              ],
              organizer,
            })
          );

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              rescheduleUid: uidOfBookingToBeRescheduled,
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

          await expectBookingInDBToBeRescheduledFromTo({
            from: {
              uid: uidOfBookingToBeRescheduled,
            },
            to: {
              description: "",
              location: "integrations:daily",
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              uid: createdBooking.uid!,
              eventTypeId: mockBookingData.eventTypeId,
              status: BookingStatus.ACCEPTED,
              metadata: {
                videoCallUrl: `${WEBAPP_URL}/video/${createdBooking?.uid}`,
              },
              responses: expect.objectContaining({
                email: booker.email,
                name: booker.name,
              }),
              // Booking References still use the original booking's references - Not sure how intentional it is.
            },
          });

          expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });

          expectSuccessfulBookingRescheduledEmails({
            booker,
            organizer,
            emails,
          });

          expectBookingRescheduledWebhookToHaveBeenFired({
            booker,
            organizer,
            location: "integrations:daily",
            subscriberUrl: "http://my-webhook.example.com",
            payload: {
              uid: createdBooking.uid,
            },
            videoCallUrl: `${WEBAPP_URL}/video/${createdBooking?.uid}`,
          });
        },
        timeout
      );

      describe("Event Type that requires confirmation", () => {
        test(
          `should reschedule a booking that requires confirmation in PENDING state - When a booker(who is not the organizer himself) is doing the reschedule
          1. Should cancel the existing booking
          2. Should delete existing calendar invite and Video meeting
          2. Should create a new booking in the database in PENDING state
          3. Should send BOOKING Requested scenario emails to the booker as well as organizer
          4. Should trigger BOOKING_REQUESTED webhook instead of BOOKING_RESCHEDULED
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
            const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
            const uidOfBookingToBeRescheduled = "n5Wv3eHgconAED2j4gcVhP";

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
                  trigger: "RESCHEDULE_EVENT",
                  action: "EMAIL_HOST",
                  template: "REMINDER",
                  activeOn: [1],
                },
              ],
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 15,
                  requiresConfirmation: true,
                  length: 15,
                  users: [
                    {
                      id: 101,
                    },
                  ],
                },
              ],
              bookings: [
                {
                  uid: uidOfBookingToBeRescheduled,
                  eventTypeId: 1,
                  status: BookingStatus.ACCEPTED,
                  startTime: `${plus1DateString}T05:00:00.000Z`,
                  endTime: `${plus1DateString}T05:15:00.000Z`,
                },
              ],
              organizer,
            });
            await createBookingScenario(scenarioData);

            const mockBookingData = getMockRequestDataForBooking({
              data: {
                eventTypeId: 1,
                rescheduleUid: uidOfBookingToBeRescheduled,
                start: `${plus1DateString}T04:00:00.000Z`,
                end: `${plus1DateString}T04:15:00.000Z`,
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

            await expectBookingInDBToBeRescheduledFromTo({
              from: {
                uid: uidOfBookingToBeRescheduled,
              },
              to: {
                description: "",
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                uid: createdBooking.uid!,
                eventTypeId: mockBookingData.eventTypeId,
                // Rescheduled booking sill stays in pending state
                status: BookingStatus.PENDING,
                location: BookingLocations.CalVideo,
                responses: expect.objectContaining({
                  email: booker.email,
                  name: booker.name,
                }),
              },
            });

            expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });

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
          `should rechedule a booking, that requires confirmation, without confirmation - When booker is the organizer of the existing booking as well as the event-type
          1. Should cancel the existing booking
          2. Should delete existing calendar invite and Video meeting
          2. Should create a new booking in the database in ACCEPTED state
          3. Should send rescheduled emails to the booker as well as organizer
          4. Should trigger BOOKING_RESCHEDULED webhook
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

            const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
            const uidOfBookingToBeRescheduled = "n5Wv3eHgconAED2j4gcVhP";
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
                    trigger: "RESCHEDULE_EVENT",
                    action: "EMAIL_HOST",
                    template: "REMINDER",
                    activeOn: [1],
                  },
                ],
                eventTypes: [
                  {
                    id: 1,
                    requiresConfirmation: true,
                    slotInterval: 15,
                    length: 15,
                    users: [
                      {
                        id: 101,
                      },
                    ],
                    destinationCalendar: {
                      integration: "google_calendar",
                      externalId: "event-type-1@example.com",
                    },
                  },
                ],
                bookings: [
                  {
                    uid: uidOfBookingToBeRescheduled,
                    eventTypeId: 1,
                    userId: organizer.id,
                    status: BookingStatus.ACCEPTED,
                    startTime: `${plus1DateString}T05:00:00.000Z`,
                    endTime: `${plus1DateString}T05:15:00.000Z`,
                    attendees: [
                      getMockBookingAttendee({
                        id: 1,
                        name: organizer.name,
                        email: organizer.email,
                        locale: "en",
                        timeZone: "Europe/London",
                      }),
                      getMockBookingAttendee({
                        id: 2,
                        name: booker.name,
                        email: booker.email,
                        // Booker's locale when the fresh booking happened earlier
                        locale: "hi",
                        // Booker's timezone when the fresh booking happened earlier
                        timeZone: "Asia/Kolkata",
                      }),
                    ],
                  },
                ],
                organizer,
              })
            );

            const mockBookingData = getMockRequestDataForBooking({
              data: {
                eventTypeId: 1,
                rescheduleUid: uidOfBookingToBeRescheduled,
                start: `${plus1DateString}T04:00:00.000Z`,
                end: `${plus1DateString}T04:15:00.000Z`,
                // Organizer is doing the rescheduling from his timezone which is different from Booker Timezone as per the booking being rescheduled
                timeZone: "Europe/London",
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

            // Fake the request to be from organizer
            req.userId = organizer.id;

            const createdBooking = await handleNewBooking(req);

            /**
             *  Booking Time should be new time
             */
            expect(createdBooking.startTime?.toISOString()).toBe(`${plus1DateString}T04:00:00.000Z`);
            expect(createdBooking.endTime?.toISOString()).toBe(`${plus1DateString}T04:15:00.000Z`);

            await expectBookingInDBToBeRescheduledFromTo({
              from: {
                uid: uidOfBookingToBeRescheduled,
              },
              to: {
                description: "",
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                uid: createdBooking.uid!,
                eventTypeId: mockBookingData.eventTypeId,
                status: BookingStatus.ACCEPTED,
                location: BookingLocations.CalVideo,
                responses: expect.objectContaining({
                  email: booker.email,
                  name: booker.name,
                }),
              },
            });

            expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });

            // updateEvent uses existing booking's externalCalendarId to update the event in calendar.
            // and not the event-type's organizer's which is event-type-1@example.com

            expectSuccessfulBookingRescheduledEmails({
              booker,
              organizer,
              emails,
              iCalUID: createdBooking.iCalUID,
            });
            expectBookingRescheduledWebhookToHaveBeenFired({
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
          `[GOOGLE MEET AS LOCATION]should rechedule a booking, that requires confirmation, without confirmation - When booker is the organizer of the existing booking as well as the event-type
          1. Should cancel the existing booking
          2. Should delete existing calendar invite and Video meeting
          2. Should create a new booking in the database in ACCEPTED state
          3. Should send rescheduled emails to the booker as well as organizer
          4. Should trigger BOOKING_RESCHEDULED webhook
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
              credentials: [getGoogleCalendarCredential(), getGoogleMeetCredential()],
            });

            const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
            const uidOfBookingToBeRescheduled = "n5Wv3eHgconAED2j4gcVhP";
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
                    trigger: "RESCHEDULE_EVENT",
                    action: "EMAIL_HOST",
                    template: "REMINDER",
                    activeOn: [1],
                  },
                ],
                eventTypes: [
                  {
                    id: 1,
                    requiresConfirmation: true,
                    slotInterval: 15,
                    length: 15,
                    locations: [
                      {
                        type: BookingLocations.GoogleMeet,
                      },
                    ],
                    users: [
                      {
                        id: 101,
                      },
                    ],
                    destinationCalendar: {
                      integration: "google_calendar",
                      externalId: "event-type-1@example.com",
                    },
                  },
                ],
                bookings: [
                  {
                    uid: uidOfBookingToBeRescheduled,
                    eventTypeId: 1,
                    userId: organizer.id,
                    status: BookingStatus.ACCEPTED,
                    location: BookingLocations.GoogleMeet,
                    startTime: `${plus1DateString}T05:00:00.000Z`,
                    endTime: `${plus1DateString}T05:15:00.000Z`,
                    attendees: [
                      getMockBookingAttendee({
                        id: 1,
                        name: organizer.name,
                        email: organizer.email,
                        locale: "en",
                        timeZone: "Europe/London",
                      }),
                      getMockBookingAttendee({
                        id: 2,
                        name: booker.name,
                        email: booker.email,
                        // Booker's locale when the fresh booking happened earlier
                        locale: "hi",
                        // Booker's timezone when the fresh booking happened earlier
                        timeZone: "Asia/Kolkata",
                      }),
                    ],
                  },
                ],
                organizer,
              })
            );

            const mockBookingData = getMockRequestDataForBooking({
              data: {
                eventTypeId: 1,
                rescheduleUid: uidOfBookingToBeRescheduled,
                start: `${plus1DateString}T04:00:00.000Z`,
                end: `${plus1DateString}T04:15:00.000Z`,
                // Organizer is doing the rescheduling from his timezone which is different from Booker Timezone as per the booking being rescheduled
                timeZone: "Europe/London",
                responses: {
                  email: booker.email,
                  name: booker.name,
                  location: { optionValue: "", value: BookingLocations.GoogleMeet },
                },
              },
            });

            const { req } = createMockNextJsRequest({
              method: "POST",
              body: mockBookingData,
            });

            // Fake the request to be from organizer
            req.userId = organizer.id;

            const createdBooking = await handleNewBooking(req);

            /**
             *  Booking Time should be new time
             */
            expect(createdBooking.startTime?.toISOString()).toBe(`${plus1DateString}T04:00:00.000Z`);
            expect(createdBooking.endTime?.toISOString()).toBe(`${plus1DateString}T04:15:00.000Z`);

            await expectBookingInDBToBeRescheduledFromTo({
              from: {
                uid: uidOfBookingToBeRescheduled,
              },
              to: {
                description: "",
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                uid: createdBooking.uid!,
                eventTypeId: mockBookingData.eventTypeId,
                status: BookingStatus.ACCEPTED,
                location: BookingLocations.GoogleMeet,
                responses: expect.objectContaining({
                  email: booker.email,
                  name: booker.name,
                }),
              },
            });

            expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });

            expectSuccessfulBookingRescheduledEmails({
              booker,
              organizer,
              emails,
              iCalUID: createdBooking.iCalUID,
            });
            expectBookingRescheduledWebhookToHaveBeenFired({
              booker,
              organizer,
              location: BookingLocations.GoogleMeet,
              subscriberUrl: "http://my-webhook.example.com",
              videoCallUrl: "https://UNUSED_URL",
            });
          },
          timeout
        );

        test(
          `should rechedule a booking, that requires confirmation, in PENDING state - Even when the rescheduler is the organizer of the event-type but not the organizer of the existing booking
        1. Should cancel the existing booking
        2. Should delete existing calendar invite and Video meeting
        2. Should create a new booking in the database in PENDING state
        3. Should send booking requested emails to the booker as well as organizer
        4. Should trigger BOOKING_REQUESTED webhook
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
            const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
            const uidOfBookingToBeRescheduled = "n5Wv3eHgconAED2j4gcVhP";
            const iCalUID = `${uidOfBookingToBeRescheduled}@Cal.com`;

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
                  trigger: "RESCHEDULE_EVENT",
                  action: "EMAIL_HOST",
                  template: "REMINDER",
                  activeOn: [1],
                },
              ],
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 15,
                  requiresConfirmation: true,
                  length: 15,
                  users: [
                    {
                      id: 101,
                    },
                  ],
                },
              ],
              bookings: [
                {
                  uid: uidOfBookingToBeRescheduled,
                  eventTypeId: 1,
                  status: BookingStatus.ACCEPTED,
                  startTime: `${plus1DateString}T05:00:00.000Z`,
                  endTime: `${plus1DateString}T05:15:00.000Z`,
                  iCalUID,
                },
              ],
              organizer,
            });
            await createBookingScenario(scenarioData);

            const mockBookingData = getMockRequestDataForBooking({
              data: {
                eventTypeId: 1,
                rescheduleUid: uidOfBookingToBeRescheduled,
                start: `${plus1DateString}T04:00:00.000Z`,
                end: `${plus1DateString}T04:15:00.000Z`,
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

            // Fake the request to be from organizer
            req.userId = organizer.id;

            const createdBooking = await handleNewBooking(req);
            expect(createdBooking.responses).toEqual(
              expect.objectContaining({
                email: booker.email,
                name: booker.name,
              })
            );

            await expectBookingInDBToBeRescheduledFromTo({
              from: {
                uid: uidOfBookingToBeRescheduled,
              },
              to: {
                description: "",
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                uid: createdBooking.uid!,
                eventTypeId: mockBookingData.eventTypeId,
                // Rescheduled booking sill stays in pending state
                status: BookingStatus.PENDING,
                location: BookingLocations.CalVideo,
                responses: expect.objectContaining({
                  email: booker.email,
                  name: booker.name,
                }),
              },
            });

            //expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });

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
          `should rechedule a booking, that requires confirmation, without confirmation - When the owner of the previous booking is doing the reschedule(but he isn't the organizer of the event-type now)
          1. Should cancel the existing booking
          2. Should delete existing calendar invite and Video meeting
          2. Should create a new booking in the database in ACCEPTED state
          3. Should send rescheduled emails to the booker as well as organizer
          4. Should trigger BOOKING_RESCHEDULED webhook
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

            const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
            const uidOfBookingToBeRescheduled = "n5Wv3eHgconAED2j4gcVhP";
            const previousOrganizerIdForTheBooking = 1001;
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
                    trigger: "RESCHEDULE_EVENT",
                    action: "EMAIL_HOST",
                    template: "REMINDER",
                    activeOn: [1],
                  },
                ],
                eventTypes: [
                  {
                    id: 1,
                    requiresConfirmation: true,
                    slotInterval: 15,
                    length: 15,
                    users: [
                      {
                        id: 101,
                      },
                    ],
                    destinationCalendar: {
                      integration: "google_calendar",
                      externalId: "event-type-1@example.com",
                    },
                  },
                ],
                bookings: [
                  {
                    uid: uidOfBookingToBeRescheduled,
                    eventTypeId: 1,
                    // Make sure that the earlier booking owner is some user with ID 10001
                    userId: previousOrganizerIdForTheBooking,
                    status: BookingStatus.ACCEPTED,
                    startTime: `${plus1DateString}T05:00:00.000Z`,
                    endTime: `${plus1DateString}T05:15:00.000Z`,
                    attendees: [
                      getMockBookingAttendee({
                        id: 1,
                        name: organizer.name,
                        email: organizer.email,
                        locale: "en",
                        timeZone: "Europe/London",
                      }),
                      getMockBookingAttendee({
                        id: 2,
                        name: booker.name,
                        email: booker.email,
                        // Booker's locale when the fresh booking happened earlier
                        locale: "hi",
                        // Booker's timezone when the fresh booking happened earlier
                        timeZone: "Asia/Kolkata",
                      }),
                    ],
                  },
                ],
                organizer,
                usersApartFromOrganizer: [
                  {
                    id: previousOrganizerIdForTheBooking,
                    name: "Previous Organizer",
                    email: "",
                    schedules: [TestData.schedules.IstWorkHours],
                    username: "prev-organizer",
                    timeZone: "Europe/London",
                  },
                ],
              })
            );

            const mockBookingData = getMockRequestDataForBooking({
              data: {
                eventTypeId: 1,
                rescheduleUid: uidOfBookingToBeRescheduled,
                start: `${plus1DateString}T04:00:00.000Z`,
                end: `${plus1DateString}T04:15:00.000Z`,
                // Organizer is doing the rescheduling from his timezone which is different from Booker Timezone as per the booking being rescheduled
                timeZone: "Europe/London",
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

            // Fake the request to be from organizer
            req.userId = previousOrganizerIdForTheBooking;

            const createdBooking = await handleNewBooking(req);

            /**
             *  Booking Time should be new time
             */
            expect(createdBooking.startTime?.toISOString()).toBe(`${plus1DateString}T04:00:00.000Z`);
            expect(createdBooking.endTime?.toISOString()).toBe(`${plus1DateString}T04:15:00.000Z`);

            await expectBookingInDBToBeRescheduledFromTo({
              from: {
                uid: uidOfBookingToBeRescheduled,
              },
              to: {
                description: "",
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                uid: createdBooking.uid!,
                eventTypeId: mockBookingData.eventTypeId,
                status: BookingStatus.ACCEPTED,
                location: BookingLocations.CalVideo,
                responses: expect.objectContaining({
                  email: booker.email,
                  name: booker.name,
                }),
              },
            });

            expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });

            expectSuccessfulBookingRescheduledEmails({
              booker,
              organizer,
              emails,
              iCalUID: createdBooking.iCalUID,
            });

            expectBookingRescheduledWebhookToHaveBeenFired({
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
    });
    describe("Team event-type", () => {
      test(
        "should send correct schedule/cancellation emails to hosts when round robin is rescheduled to different host",
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const booker = getBooker({
            email: "Ym9va2VyQGV4YW1wbGUuY29t",
            name: "Booker",
          });

          const roundRobinHost1 = getOrganizer({
            name: "RR Host 1",
            email: "rrhost1@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
          });

          const roundRobinHost2 = getOrganizer({
            name: "RR Host 2",
            email: "rrhost2@example.com",
            id: 102,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
          });

          const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
          const uidOfBookingToBeRescheduled = "n5Wv3eHgconAED2j4gcVhP";
          await createBookingScenario(
            getScenarioData({
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 15,
                  length: 15,
                  users: [
                    {
                      id: 101,
                    },
                    {
                      id: 102,
                    },
                  ],
                  schedulingType: SchedulingType.ROUND_ROBIN,
                },
              ],
              bookings: [
                {
                  uid: uidOfBookingToBeRescheduled,
                  eventTypeId: 1,
                  userId: 101,
                  status: BookingStatus.ACCEPTED,
                  startTime: `${plus1DateString}T05:00:00.000Z`,
                  endTime: `${plus1DateString}T05:15:00.000Z`,
                  metadata: {
                    videoCallUrl: "https://existing-daily-video-call-url.example.com",
                  },
                },
              ],
              organizer: roundRobinHost1,
              usersApartFromOrganizer: [roundRobinHost2],
            })
          );

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              user: roundRobinHost1.name,
              rescheduleUid: uidOfBookingToBeRescheduled,
              start: `${plus1DateString}T04:00:00.000Z`,
              end: `${plus1DateString}T04:15:00.000Z`,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
              rescheduledBy: booker.email,
            },
          });
          const { req } = createMockNextJsRequest({
            method: "POST",
            body: mockBookingData,
          });

          const createdBooking = await handleNewBooking(req);

          const previousBooking = await prismaMock.booking.findUnique({
            where: {
              uid: uidOfBookingToBeRescheduled,
            },
          });

          logger.silly({
            previousBooking,
            allBookings: await prismaMock.booking.findMany(),
          });

          // Expect previous booking to be cancelled
          await expectBookingToBeInDatabase({
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            uid: uidOfBookingToBeRescheduled,
            status: BookingStatus.CANCELLED,
            rescheduledBy: booker.email,
          });

          expect(previousBooking?.status).toBe(BookingStatus.CANCELLED);
          /**
           *  Booking Time should be new time
           */
          expect(createdBooking.startTime?.toISOString()).toBe(`${plus1DateString}T04:00:00.000Z`);
          expect(createdBooking.endTime?.toISOString()).toBe(`${plus1DateString}T04:15:00.000Z`);

          await expectBookingInDBToBeRescheduledFromTo({
            from: {
              uid: uidOfBookingToBeRescheduled,
            },
            to: {
              description: "",
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              uid: createdBooking.uid!,
              eventTypeId: mockBookingData.eventTypeId,
              status: BookingStatus.ACCEPTED,
              location: BookingLocations.CalVideo,
              responses: expect.objectContaining({
                email: booker.email,
                name: booker.name,
              }),
            },
          });

          expectSuccessfulRoundRobinReschedulingEmails({
            prevOrganizer: roundRobinHost1,
            newOrganizer: roundRobinHost2,
            emails,
          });
        },
        timeout
      );

      test(
        "should send rescheduling emails when round robin is rescheduled to same host",
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const roundRobinHost1 = getOrganizer({
            name: "RR Host 1",
            email: "rrhost1@example.com",
            id: 101,
            schedules: [TestData.schedules.IstMorningShift],
            credentials: [getGoogleCalendarCredential()],
          });

          const roundRobinHost2 = getOrganizer({
            name: "RR Host 2",
            email: "rrhost2@example.com",
            id: 102,
            schedules: [TestData.schedules.IstEveningShift],
            credentials: [getGoogleCalendarCredential()],
          });

          const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
          const uidOfBookingToBeRescheduled = "n5Wv3eHgconAED2j4gcVhP";
          await createBookingScenario(
            getScenarioData({
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 15,
                  length: 15,
                  users: [
                    {
                      id: 101,
                    },
                    {
                      id: 102,
                    },
                  ],
                  schedulingType: SchedulingType.ROUND_ROBIN,
                },
              ],
              bookings: [
                {
                  uid: uidOfBookingToBeRescheduled,
                  eventTypeId: 1,
                  userId: 101,
                  status: BookingStatus.ACCEPTED,
                  startTime: `${plus1DateString}T05:00:00.000Z`,
                  endTime: `${plus1DateString}T05:15:00.000Z`,
                },
              ],
              organizer: roundRobinHost1,
              usersApartFromOrganizer: [roundRobinHost2],
            })
          );

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              user: roundRobinHost1.name,
              rescheduleUid: uidOfBookingToBeRescheduled,
              start: `${plus1DateString}T04:00:00.000Z`,
              end: `${plus1DateString}T04:15:00.000Z`,
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

          const previousBooking = await prismaMock.booking.findUnique({
            where: {
              uid: uidOfBookingToBeRescheduled,
            },
          });

          logger.silly({
            previousBooking,
            allBookings: await prismaMock.booking.findMany(),
          });

          // Expect previous booking to be cancelled
          await expectBookingToBeInDatabase({
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            uid: uidOfBookingToBeRescheduled,
            status: BookingStatus.CANCELLED,
          });

          expect(previousBooking?.status).toBe(BookingStatus.CANCELLED);
          /**
           *  Booking Time should be new time
           */
          expect(createdBooking.startTime?.toISOString()).toBe(`${plus1DateString}T04:00:00.000Z`);
          expect(createdBooking.endTime?.toISOString()).toBe(`${plus1DateString}T04:15:00.000Z`);

          await expectBookingInDBToBeRescheduledFromTo({
            from: {
              uid: uidOfBookingToBeRescheduled,
            },
            to: {
              description: "",
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              uid: createdBooking.uid!,
              eventTypeId: mockBookingData.eventTypeId,
              status: BookingStatus.ACCEPTED,
              location: BookingLocations.CalVideo,
              responses: expect.objectContaining({
                email: booker.email,
                name: booker.name,
              }),
            },
          });

          expectSuccessfulRoundRobinReschedulingEmails({
            prevOrganizer: roundRobinHost1,
            newOrganizer: roundRobinHost1, // Round robin host 2 is not available and it will be rescheduled to same user
            emails,
          });
        },
        timeout
      );

      test(
        "[Event Type with Both Email and Attendee Phone Number as required fields] should send rescheduling emails when round robin is rescheduled to same host",
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const TEST_ATTENDEE_NUMBER = "+919876543210";
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
            attendeePhoneNumber: TEST_ATTENDEE_NUMBER,
          });

          const roundRobinHost1 = getOrganizer({
            name: "RR Host 1",
            email: "rrhost1@example.com",
            id: 101,
            schedules: [TestData.schedules.IstMorningShift],
            credentials: [getGoogleCalendarCredential()],

            teams: [
              {
                membership: {
                  accepted: true,
                },
                team: {
                  id: 1,
                  name: "Team 1",
                  slug: "team-1",
                },
              },
            ],
          });

          const roundRobinHost2 = getOrganizer({
            name: "RR Host 2",
            email: "rrhost2@example.com",
            id: 102,
            schedules: [TestData.schedules.IstEveningShift],
            credentials: [getGoogleCalendarCredential()],

            teams: [
              {
                membership: {
                  accepted: true,
                },
                team: {
                  id: 1,
                  name: "Team 1",
                  slug: "team-1",
                },
              },
            ],
          });

          const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
          const uidOfBookingToBeRescheduled = "n5Wv3eHgconAED2j4gcVhP";
          await createBookingScenario(
            getScenarioData({
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 15,
                  length: 15,
                  teamId: 1,
                  users: [
                    {
                      id: 101,
                    },
                    {
                      id: 102,
                    },
                  ],
                  schedulingType: SchedulingType.ROUND_ROBIN,
                  bookingFields: getDefaultBookingFields({
                    emailField: {
                      name: "email",
                      type: "email",
                      label: "",
                      hidden: false,
                      sources: [{ id: "default", type: "default", label: "Default" }],
                      editable: "system-but-optional",
                      required: true,
                      placeholder: "",
                      defaultLabel: "email_address",
                    },
                    bookingFields: [
                      {
                        name: "attendeePhoneNumber",
                        type: "phone",
                        hidden: false,
                        sources: [{ id: "default", type: "default", label: "Default" }],
                        editable: "system-but-optional",
                        required: true,
                        defaultLabel: "phone_number",
                      },
                    ],
                  }),
                },
              ],
              bookings: [
                {
                  uid: uidOfBookingToBeRescheduled,
                  eventTypeId: 1,
                  userId: 101,
                  status: BookingStatus.ACCEPTED,
                  startTime: `${plus1DateString}T05:00:00.000Z`,
                  endTime: `${plus1DateString}T05:15:00.000Z`,
                },
              ],
              organizer: roundRobinHost1,
              usersApartFromOrganizer: [roundRobinHost2],
            })
          );

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              user: roundRobinHost1.name,
              rescheduleUid: uidOfBookingToBeRescheduled,
              start: `${plus1DateString}T04:00:00.000Z`,
              end: `${plus1DateString}T04:15:00.000Z`,
              responses: {
                email: booker.email,
                name: booker.name,
                attendeePhoneNumber: booker.attendeePhoneNumber,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
            },
          });
          const { req } = createMockNextJsRequest({
            method: "POST",
            body: mockBookingData,
          });

          const createdBooking = await handleNewBooking(req);

          const previousBooking = await prismaMock.booking.findUnique({
            where: {
              uid: uidOfBookingToBeRescheduled,
            },
          });

          logger.silly({
            previousBooking,
            allBookings: await prismaMock.booking.findMany(),
          });

          // Expect previous booking to be cancelled
          await expectBookingToBeInDatabase({
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            uid: uidOfBookingToBeRescheduled,
            status: BookingStatus.CANCELLED,
          });

          expect(previousBooking?.status).toBe(BookingStatus.CANCELLED);
          /**
           *  Booking Time should be new time
           */
          expect(createdBooking.startTime?.toISOString()).toBe(`${plus1DateString}T04:00:00.000Z`);
          expect(createdBooking.endTime?.toISOString()).toBe(`${plus1DateString}T04:15:00.000Z`);

          await expectBookingInDBToBeRescheduledFromTo({
            from: {
              uid: uidOfBookingToBeRescheduled,
            },
            to: {
              description: "",
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              uid: createdBooking.uid!,
              eventTypeId: mockBookingData.eventTypeId,
              status: BookingStatus.ACCEPTED,
              location: BookingLocations.CalVideo,
              responses: expect.objectContaining({
                email: booker.email,
                attendeePhoneNumber: booker.attendeePhoneNumber,
                name: booker.name,
              }),
            },
          });

          expectSuccessfulRoundRobinReschedulingEmails({
            prevOrganizer: roundRobinHost1,
            newOrganizer: roundRobinHost1, // Round robin host 2 is not available and it will be rescheduled to same user
            emails,
          });
        },
        timeout
      );

      test(
        "should reschedule event with same round robin host",
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const roundRobinHost1 = getOrganizer({
            name: "RR Host 1",
            email: "rrhost1@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
          });

          const roundRobinHost2 = getOrganizer({
            name: "RR Host 2",
            email: "rrhost2@example.com",
            id: 102,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
          });

          const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
          const uidOfBookingToBeRescheduled = "n5Wv3eHgconAED2j4gcVhP";
          await createBookingScenario(
            getScenarioData({
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 15,
                  length: 15,
                  hosts: [
                    {
                      userId: 101,
                      isFixed: false,
                    },
                    {
                      userId: 102,
                      isFixed: false,
                    },
                  ],
                  schedulingType: SchedulingType.ROUND_ROBIN,
                  rescheduleWithSameRoundRobinHost: true,
                },
              ],
              bookings: [
                {
                  uid: uidOfBookingToBeRescheduled,
                  eventTypeId: 1,
                  userId: 102,
                  status: BookingStatus.ACCEPTED,
                  startTime: `${plus1DateString}T05:00:00.000Z`,
                  endTime: `${plus1DateString}T05:15:00.000Z`,
                  metadata: {
                    videoCallUrl: "https://existing-daily-video-call-url.example.com",
                  },
                },
              ],
              organizer: roundRobinHost1,
              usersApartFromOrganizer: [roundRobinHost2],
            })
          );

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              user: roundRobinHost1.name,
              rescheduleUid: uidOfBookingToBeRescheduled,
              start: `${plus1DateString}T04:00:00.000Z`,
              end: `${plus1DateString}T04:15:00.000Z`,
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

          const previousBooking = await prismaMock.booking.findUnique({
            where: {
              uid: uidOfBookingToBeRescheduled,
            },
          });

          logger.silly({
            previousBooking,
            allBookings: await prismaMock.booking.findMany(),
          });

          // Expect previous booking to be cancelled
          await expectBookingToBeInDatabase({
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            uid: uidOfBookingToBeRescheduled,
            status: BookingStatus.CANCELLED,
          });

          expect(previousBooking?.status).toBe(BookingStatus.CANCELLED);
          /**
           *  Booking Time should be new time
           */
          expect(createdBooking.startTime?.toISOString()).toBe(`${plus1DateString}T04:00:00.000Z`);
          expect(createdBooking.endTime?.toISOString()).toBe(`${plus1DateString}T04:15:00.000Z`);

          // Expect both hosts for the event types to be the same
          expect(createdBooking.userId).toBe(previousBooking?.userId ?? -1);

          await expectBookingInDBToBeRescheduledFromTo({
            from: {
              uid: uidOfBookingToBeRescheduled,
            },
            to: {
              description: "",
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              uid: createdBooking.uid!,
              eventTypeId: mockBookingData.eventTypeId,
              status: BookingStatus.ACCEPTED,
              location: BookingLocations.CalVideo,
              responses: expect.objectContaining({
                email: booker.email,
                name: booker.name,
              }),
            },
          });

          expectSuccessfulRoundRobinReschedulingEmails({
            prevOrganizer: roundRobinHost1,
            newOrganizer: roundRobinHost1,
            emails,
          });
        },
        timeout
      );

      test(
        "should reschedule as per routedTeamMemberIds(instead of same host) even if rescheduleWithSameRoundRobinHost is true but it is a rerouting scenario",
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const otherHost = getOrganizer({
            name: "RR Host 1",
            email: "rrhost1@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
          });

          const hostOfOriginalBooking = getOrganizer({
            name: "RR Host 2",
            email: "rrhost2@example.com",
            id: 102,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
          });

          const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
          const uidOfBookingToBeRescheduled = "n5Wv3eHgconAED2j4gcVhP";
          await createBookingScenario(
            getScenarioData({
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 15,
                  length: 15,
                  hosts: [
                    {
                      userId: 101,
                      isFixed: false,
                    },
                    {
                      userId: 102,
                      isFixed: false,
                    },
                  ],
                  schedulingType: SchedulingType.ROUND_ROBIN,
                  rescheduleWithSameRoundRobinHost: true,
                },
              ],
              bookings: [
                {
                  uid: uidOfBookingToBeRescheduled,
                  eventTypeId: 1,
                  userId: 102,
                  status: BookingStatus.ACCEPTED,
                  startTime: `${plus1DateString}T05:00:00.000Z`,
                  endTime: `${plus1DateString}T05:15:00.000Z`,
                  metadata: {
                    videoCallUrl: "https://existing-daily-video-call-url.example.com",
                  },
                },
              ],
              organizer: otherHost,
              usersApartFromOrganizer: [hostOfOriginalBooking],
            })
          );

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              user: otherHost.name,
              rescheduleUid: uidOfBookingToBeRescheduled,
              start: `${plus1DateString}T04:00:00.000Z`,
              end: `${plus1DateString}T04:15:00.000Z`,
              routedTeamMemberIds: [101],
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

          const previousBooking = await prismaMock.booking.findUnique({
            where: {
              uid: uidOfBookingToBeRescheduled,
            },
          });

          logger.silly({
            previousBooking,
            allBookings: await prismaMock.booking.findMany(),
          });

          // Expect previous booking to be cancelled
          await expectBookingToBeInDatabase({
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            uid: uidOfBookingToBeRescheduled,
            status: BookingStatus.CANCELLED,
          });

          expect(previousBooking?.status).toBe(BookingStatus.CANCELLED);
          /**
           *  Booking Time should be new time
           */
          expect(createdBooking.startTime?.toISOString()).toBe(`${plus1DateString}T04:00:00.000Z`);
          expect(createdBooking.endTime?.toISOString()).toBe(`${plus1DateString}T04:15:00.000Z`);

          expect(createdBooking.userId).toBe(otherHost.id);

          await expectBookingInDBToBeRescheduledFromTo({
            from: {
              uid: uidOfBookingToBeRescheduled,
            },
            to: {
              description: "",
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              uid: createdBooking.uid!,
              eventTypeId: mockBookingData.eventTypeId,
              status: BookingStatus.ACCEPTED,
              location: BookingLocations.CalVideo,
              responses: expect.objectContaining({
                email: booker.email,
                name: booker.name,
              }),
            },
          });

          expectSuccessfulRoundRobinReschedulingEmails({
            prevOrganizer: hostOfOriginalBooking,
            newOrganizer: otherHost,
            emails,
          });
        },
        timeout
      );
    });
  });
});
