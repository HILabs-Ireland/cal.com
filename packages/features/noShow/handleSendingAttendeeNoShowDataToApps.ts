import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import type { NoShowAttendees } from "../handleMarkNoShow";

const log = logger.getSubLogger({ prefix: ["handleSendingNoShowDataToApps"] });

export default async function handleSendingAttendeeNoShowDataToApps(
  bookingUid: string,
  attendees: NoShowAttendees
) {
  // Get event type metadata
  const eventTypeQuery = await prisma.booking.findFirst({
    where: {
      uid: bookingUid,
    },
    select: {
      eventType: {
        select: {
          metadata: true,
        },
      },
    },
  });
  if (!eventTypeQuery || !eventTypeQuery?.eventType?.metadata) {
    log.warn(`For no show, could not find eventType for bookingUid ${bookingUid}`);
    return;
  }

  const eventTypeMetadataParse = EventTypeMetaDataSchema.safeParse(eventTypeQuery?.eventType?.metadata);
  if (!eventTypeMetadataParse.success) {
    log.error(`Malformed event type metadata for bookingUid ${bookingUid}`);
    return;
  }

  return;
}
