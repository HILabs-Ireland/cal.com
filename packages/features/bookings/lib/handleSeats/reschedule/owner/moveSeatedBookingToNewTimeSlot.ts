// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";

import { sendRescheduledEmailsAndSMS } from "@calcom/emails";
import prisma from "@calcom/prisma";
import type { AppsStatus } from "@calcom/types/Calendar";

import type { createLoggerWithEventDetails } from "../../../handleNewBooking";
import { addVideoCallDataToEvent } from "../../../handleNewBooking/addVideoCallDataToEvent";
import { findBookingQuery } from "../../../handleNewBooking/findBookingQuery";
import type { Booking } from "../../../handleNewBooking/types";
import type { SeatedBooking, RescheduleSeatedBookingObject } from "../../types";

const moveSeatedBookingToNewTimeSlot = async (
  rescheduleSeatedBookingObject: RescheduleSeatedBookingObject,
  seatedBooking: SeatedBooking,
  loggerWithEventDetails: ReturnType<typeof createLoggerWithEventDetails>
) => {
  const {
    rescheduleReason,
    rescheduleUid,
    eventType,
    organizerUser,
    reqAppsStatus,
    noEmail,
    isConfirmedByDefault,
    additionalNotes,
  } = rescheduleSeatedBookingObject;
  let { evt } = rescheduleSeatedBookingObject;

  const newBooking: (Booking & { appsStatus?: AppsStatus[] }) | null = await prisma.booking.update({
    where: {
      id: seatedBooking.id,
    },
    data: {
      startTime: evt.startTime,
      endTime: evt.endTime,
      cancellationReason: rescheduleReason,
    },
    include: {
      user: true,
      references: true,
      attendees: true,
    },
  });

  evt = { ...addVideoCallDataToEvent(newBooking.references, evt), bookerUrl: evt.bookerUrl };

  // @NOTE: This code is duplicated and should be moved to a function
  // This gets overridden when updating the event - to check if notes have been hidden or not. We just reset this back
  // to the default description when we are sending the emails.
  evt.description = eventType.description;

  if (noEmail !== true && isConfirmedByDefault) {
    const copyEvent = cloneDeep(evt);
    loggerWithEventDetails.debug("Emails: Sending reschedule emails - handleSeats");
    await sendRescheduledEmailsAndSMS(
      {
        ...copyEvent,
        additionalNotes, // Resets back to the additionalNote input and not the override value
        cancellationReason: `$RCH$${rescheduleReason ? rescheduleReason : ""}`, // Removable code prefix to differentiate cancellation from rescheduling for email
      },
      eventType.metadata
    );
  }
  const foundBooking = await findBookingQuery(newBooking.id);

  return { ...foundBooking, appsStatus: newBooking.appsStatus };
};

export default moveSeatedBookingToNewTimeSlot;
