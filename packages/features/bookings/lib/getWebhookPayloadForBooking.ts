import type { EventPayloadType, EventTypeInfo } from "@calcom/features/webhooks/lib/sendPayload";
import type { CalendarEvent } from "@calcom/types/Calendar";

export const getWebhookPayloadForBooking = ({
  booking,
  evt,
}: {
  booking: {
    eventType: {
      title: string;
      description: string | null;
      requiresConfirmation: boolean;
      length: number;
      id: number;
    } | null;
    id: number;
    eventTypeId: number | null;
    userId: number | null;
  };
  evt: CalendarEvent;
}) => {
  const eventTypeInfo: EventTypeInfo = {
    eventTitle: booking.eventType?.title,
    eventDescription: booking.eventType?.description,
    requiresConfirmation: booking.eventType?.requiresConfirmation || null,
    length: booking.eventType?.length,
  };

  const payload: EventPayloadType = {
    ...evt,
    ...eventTypeInfo,
    bookingId: booking.id,
  };

  return payload;
};
