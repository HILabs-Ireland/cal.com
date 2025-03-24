import type { RecurringEventControllerProps } from "./RecurringEventController";
import RecurringEventController from "./RecurringEventController";

export const EventRecurringTab = ({ eventType, customClassNames }: RecurringEventControllerProps) => {
  return <RecurringEventController eventType={eventType} customClassNames={customClassNames} />;
};
