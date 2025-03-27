import type { EventTypeSetup } from "@calcom/features/eventtypes/lib/types";

import type { RecurringEventControllerProps } from "./RecurringEventController";
import RecurringEventController from "./RecurringEventController";

export interface EventRecurringTabProps {
  eventType: EventTypeSetup;
  customClassNames?: string;
}

export const EventRecurringTab = ({ eventType, customClassNames }: RecurringEventControllerProps) => {
  return <RecurringEventController eventType={eventType} customClassNames={customClassNames} />;
};
