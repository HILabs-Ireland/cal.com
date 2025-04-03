import type { DestinationCalendar } from "@prisma/client";

/**
 * When inviting attendees to a calendar event, sometimes the external ID is only used for internal purposes
 * Need to process the correct external ID for the calendar service
 */
const processExternalId = (destinationCalendar: DestinationCalendar) => {
  return destinationCalendar.externalId;
};

export default processExternalId;
