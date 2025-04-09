import dayjs from "@calcom/dayjs";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { TimeUnit } from "@calcom/prisma/enums";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { getBooking } from "./getBooking";
import type { TWebhook, TTriggerNoShowPayloadSchema } from "./schema";

type OriginalRescheduledBooking =
  | {
      rescheduledBy?: string | null;
    }
  | null
  | undefined;

export type Host = {
  id: number;
  email: string;
};

export type Booking = Awaited<ReturnType<typeof getBooking>>;
type Webhook = TWebhook;
export type Participants = TTriggerNoShowPayloadSchema["data"][number]["participants"];

export function getHosts(booking: Booking): Host[] {
  const hostMap = new Map<number, Host>();

  const addHost = (id: number, email: string) => {
    if (!hostMap.has(id)) {
      hostMap.set(id, { id, email });
    }
  };

  booking?.eventType?.hosts?.forEach((host) => addHost(host.userId, host.user.email));
  booking?.eventType?.users?.forEach((user) => addHost(user.id, user.email));

  // Add booking.user if not already included
  if (booking?.user?.id && booking?.user?.email) {
    addHost(booking.user.id, booking.user.email);
  }

  // Filter hosts to only include those who are also attendees
  const attendeeEmails = new Set(booking.attendees?.map((attendee) => attendee.email));
  const filteredHosts = Array.from(hostMap.values()).filter(
    (host) => attendeeEmails.has(host.email) || host.id === booking.user?.id
  );

  return filteredHosts;
}

export function sendWebhookPayload(
  webhook: Webhook,
  triggerEvent: WebhookTriggerEvents,
  booking: Booking,
  maxStartTime: number,
  participants: ParticipantsWithEmail,
  originalRescheduledBooking?: OriginalRescheduledBooking,
  hostEmail?: string
): Promise<any> {
  const maxStartTimeHumanReadable = dayjs.unix(maxStartTime).format("YYYY-MM-DD HH:mm:ss Z");

  return sendGenericWebhookPayload({
    secretKey: webhook.secret,
    triggerEvent,
    createdAt: new Date().toISOString(),
    webhook,
    data: {
      title: booking.title,
      bookingId: booking.id,
      bookingUid: booking.uid,
      startTime: booking.startTime,
      attendees: booking.attendees,
      endTime: booking.endTime,
      participants,
      ...(!!hostEmail ? { hostEmail } : {}),
      ...(originalRescheduledBooking ? { rescheduledBy: originalRescheduledBooking.rescheduledBy } : {}),
      eventType: {
        ...booking.eventType,
        id: booking.eventTypeId,
        hosts: undefined,
        users: undefined,
      },
      webhook: {
        ...webhook,
        secret: undefined,
      },
      message:
        triggerEvent === WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
          ? `Guest didn't join the call or didn't join before ${maxStartTimeHumanReadable}`
          : `Host with email ${hostEmail} didn't join the call or didn't join before ${maxStartTimeHumanReadable}`,
    },
  }).catch((e) => {
    console.error(
      `Error executing webhook for event: ${triggerEvent}, URL: ${webhook.subscriberUrl}`,
      webhook,
      e
    );
  });
}

export function calculateMaxStartTime(startTime: Date, time: number, timeUnit: TimeUnit): number {
  return dayjs(startTime)
    .add(time, timeUnit.toLowerCase() as dayjs.ManipulateType)
    .unix();
}

export function checkIfUserJoinedTheCall(userId: number, allParticipants: Participants): boolean {
  return allParticipants.some(
    (participant) => participant.user_id && parseInt(participant.user_id) === userId
  );
}

const getUserById = async (userId: number) => {
  return prisma.user.findUnique({
    where: { id: userId },
  });
};

type ParticipantsWithEmail = (Participants[number] & { email?: string })[];

export async function getParticipantsWithEmail(
  allParticipants: Participants
): Promise<ParticipantsWithEmail> {
  const participantsWithEmail = await Promise.all(
    allParticipants.map(async (participant) => {
      if (!participant.user_id) return participant;

      const user = await getUserById(parseInt(participant.user_id));
      return { ...participant, email: user?.email };
    })
  );

  return participantsWithEmail;
}

export const log = logger.getSubLogger({ prefix: ["triggerNoShowTask"] });
