import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";

import InstantEventController from "./InstantEventController";

export const EventInstantTab = ({
  eventType,
  isTeamEvent,
}: Pick<EventTypeSetupProps, "eventType"> & { isTeamEvent: boolean }) => {
  return <InstantEventController eventType={eventType} isTeamEvent={isTeamEvent} />;
};
