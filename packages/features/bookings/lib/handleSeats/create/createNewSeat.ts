// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";
import { uuid } from "short-uuid";

import { sendScheduledSeatsEmailsAndSMS } from "@calcom/emails";
import {
  allowDisablingAttendeeConfirmationEmails,
  allowDisablingHostConfirmationEmails,
} from "@calcom/features/ee/workflows/lib/allowDisablingStandardEmails";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import { findBookingQuery } from "../../handleNewBooking/findBookingQuery";
import type { SeatedBooking, NewSeatedBookingObject, HandleSeatsResultBooking } from "../types";

const createNewSeat = async (
  rescheduleSeatedBookingObject: NewSeatedBookingObject,
  seatedBooking: SeatedBooking,
  metadata?: Record<string, string>
) => {
  const {
    tAttendees,
    attendeeLanguage,
    invitee,
    eventType,
    additionalNotes,
    noEmail,
    allCredentials,
    organizerUser,
    fullName,
    bookerEmail,
    responses,
    workflows,
    bookerPhoneNumber,
  } = rescheduleSeatedBookingObject;
  let { evt } = rescheduleSeatedBookingObject;
  let resultBooking: HandleSeatsResultBooking;
  // Need to add translation for attendees to pass type checks. Since these values are never written to the db we can just use the new attendee language
  const bookingAttendees = seatedBooking.attendees.map((attendee) => {
    return { ...attendee, language: { translate: tAttendees, locale: attendeeLanguage ?? "en" } };
  });

  evt = { ...evt, attendees: [...bookingAttendees, invitee[0]] };

  if (
    eventType.seatsPerTimeSlot &&
    eventType.seatsPerTimeSlot <= seatedBooking.attendees.filter((attendee) => !!attendee.bookingSeat).length
  ) {
    throw new HttpError({ statusCode: 409, message: ErrorCode.BookingSeatsFull });
  }

  const videoCallReference = seatedBooking.references.find((reference) => reference.type.includes("_video"));

  if (videoCallReference) {
    evt.videoCallData = {
      type: videoCallReference.type,
      id: videoCallReference.meetingId,
      password: videoCallReference?.meetingPassword,
      url: videoCallReference.meetingUrl,
    };
  }

  const attendeeUniqueId = uuid();

  const inviteeToAdd = invitee[0];

  await prisma.booking.update({
    where: {
      uid: seatedBooking.uid,
    },
    include: {
      attendees: true,
    },
    data: {
      attendees: {
        create: {
          email: inviteeToAdd.email,
          phoneNumber: inviteeToAdd.phoneNumber,
          name: inviteeToAdd.name,
          timeZone: inviteeToAdd.timeZone,
          locale: inviteeToAdd.language.locale,
          bookingSeat: {
            create: {
              referenceUid: attendeeUniqueId,
              data: {
                description: additionalNotes,
                responses,
              },
              metadata,
              booking: {
                connect: {
                  id: seatedBooking.id,
                },
              },
            },
          },
        },
      },
      ...(seatedBooking.status === BookingStatus.CANCELLED && { status: BookingStatus.ACCEPTED }),
    },
  });

  evt.attendeeSeatId = attendeeUniqueId;

  const newSeat = seatedBooking.attendees.length !== 0;

  /**
   * Remember objects are passed into functions as references
   * so if you modify it in a inner function it will be modified in the outer function
   * deep cloning evt to avoid this
   */
  if (!evt?.uid) {
    evt.uid = seatedBooking?.uid ?? null;
  }
  const copyEvent = cloneDeep(evt);
  copyEvent.uid = seatedBooking.uid;
  if (noEmail !== true) {
    let isHostConfirmationEmailsDisabled = false;
    let isAttendeeConfirmationEmailDisabled = false;

    isHostConfirmationEmailsDisabled = eventType.metadata?.disableStandardEmails?.confirmation?.host || false;
    isAttendeeConfirmationEmailDisabled =
      eventType.metadata?.disableStandardEmails?.confirmation?.attendee || false;

    if (isHostConfirmationEmailsDisabled) {
      isHostConfirmationEmailsDisabled = allowDisablingHostConfirmationEmails(workflows);
    }

    if (isAttendeeConfirmationEmailDisabled) {
      isAttendeeConfirmationEmailDisabled = allowDisablingAttendeeConfirmationEmails(workflows);
    }
    await sendScheduledSeatsEmailsAndSMS(
      copyEvent,
      inviteeToAdd,
      newSeat,
      !!eventType.seatsShowAttendees,
      isHostConfirmationEmailsDisabled,
      isAttendeeConfirmationEmailDisabled,
      eventType.metadata
    );
  }

  const foundBooking = await findBookingQuery(seatedBooking.id);

  // eslint-disable-next-line prefer-const
  resultBooking = { ...foundBooking };

  resultBooking["seatReferenceUid"] = evt.attendeeSeatId;

  return resultBooking;
};

export default createNewSeat;
