import { EventRecurringTab } from "@calcom/features/eventtypes/components/tabs/recurring/EventRecurringTab";
import type { RecurringEventControllerProps } from "@calcom/features/eventtypes/components/tabs/recurring/RecurringEventController";

const EventRecurringWebWrapper = (props: RecurringEventControllerProps) => {
  return <EventRecurringTab {...props} />;
};

export default EventRecurringWebWrapper;
