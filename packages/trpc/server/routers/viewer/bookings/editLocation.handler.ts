import type { z } from "zod";

import { OrganizerDefaultConferencingAppType } from "@calcom/app-store/locations";
import { sendLocationChangeEmailsAndSMS } from "@calcom/emails";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import { buildCalEventFromBooking } from "@calcom/lib/buildCalEventFromBooking";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server";
import { getUsersCredentials } from "@calcom/lib/server/getUsersCredentials";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { prisma } from "@calcom/prisma";
import type { Booking } from "@calcom/prisma/client";
import type { userMetadata } from "@calcom/prisma/zod-utils";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { AdditionalInformation, CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { Ensure } from "@calcom/types/utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TEditLocationInputSchema } from "./editLocation.schema";
import type { BookingsProcedureContext } from "./util";

// #region EditLocation Types and Helpers
type EditLocationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  } & BookingsProcedureContext;
  input: TEditLocationInputSchema;
};

type UserMetadata = z.infer<typeof userMetadata>;

function extractAdditionalInformation(result: {
  updatedEvent: AdditionalInformation;
}): AdditionalInformation {
  const additionalInformation: AdditionalInformation = {};
  if (result) {
    additionalInformation.hangoutLink = result.updatedEvent?.hangoutLink;
    additionalInformation.conferenceData = result.updatedEvent?.conferenceData;
    additionalInformation.entryPoints = result.updatedEvent?.entryPoints;
  }
  return additionalInformation;
}

async function updateBookingLocationInDb({
  booking,
  evt,
}: {
  booking: {
    id: number;
    metadata: Booking["metadata"];
    responses: Booking["responses"];
  };
  evt: Ensure<CalendarEvent, "location">;
}) {
  const bookingMetadataUpdate = {
    videoCallUrl: getVideoCallUrlFromCalEvent(evt),
  };

  await prisma.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      location: evt.location,
      metadata: {
        ...(typeof booking.metadata === "object" && booking.metadata),
        ...bookingMetadataUpdate,
      },
      responses: {
        ...(typeof booking.responses === "object" && booking.responses),
        location: {
          value: evt.location,
          optionValue: "",
        },
      },
    },
  });
}

async function getAllCredentials({
  user,
  conferenceCredentialId,
}: {
  user: { id: number };
  conferenceCredentialId: number | null;
}) {
  const credentials = await getUsersCredentials(user);

  let conferenceCredential: CredentialPayload | null = null;

  if (conferenceCredentialId) {
    conferenceCredential = await CredentialRepository.findFirstByIdWithKeyAndUser({
      id: conferenceCredentialId,
    });
  }
  return [...(credentials ? credentials : []), ...(conferenceCredential ? [conferenceCredential] : [])];
}

async function getLocationInEvtFormatOrThrow({
  location,
  organizer,
  loggedInUserTranslate,
}: {
  location: string;
  organizer: {
    name: string | null;
    metadata: UserMetadata;
  };
  loggedInUserTranslate: Awaited<ReturnType<typeof getTranslation>>;
}) {
  if (location !== OrganizerDefaultConferencingAppType) {
    return location;
  }

  throw new TRPCError({ code: "BAD_REQUEST", message: "Default conferencing app not set" });
}
// #endregion

/**
 * An error that should be shown to the user
 */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocationError";
  }
}

/**
 * An error that should not be shown to the user
 */
export class SystemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SystemError";
  }
}

export async function editLocationHandler({ ctx, input }: EditLocationOptions) {
  const { newLocation, credentialId: conferenceCredentialId } = input;
  const { booking, user: loggedInUser } = ctx;

  const organizer = await UserRepository.findByIdOrThrow({ id: booking.userId || 0 });

  const newLocationInEvtFormat = await getLocationInEvtFormatOrThrow({
    location: newLocation,
    organizer,
    loggedInUserTranslate: await getTranslation(loggedInUser.locale ?? "en", "common"),
  });

  const evt = await buildCalEventFromBooking({
    booking,
    organizer,
    location: newLocationInEvtFormat,
    conferenceCredentialId,
  });

  await updateBookingLocationInDb({
    booking,
    evt: { ...evt },
  });

  try {
    await sendLocationChangeEmailsAndSMS({ ...evt }, booking?.eventType?.metadata as EventTypeMetadata);
  } catch (error) {
    console.log("Error sending LocationChangeEmails", safeStringify(error));
  }

  return { message: "Location updated" };
}
