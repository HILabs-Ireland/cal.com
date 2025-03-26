import type { RecurringEventControllerProps } from "./RecurringEventController";
import RecurringEventController from "./RecurringEventController";

export interface EventRecurringTabProps {
  eventType: SomeType;
  customClassNames?: string;
}

export const EventRecurringTab = ({ eventType, customClassNames }: RecurringEventControllerProps) => {
  return <RecurringEventController eventType={eventType} customClassNames={customClassNames} />;
};
