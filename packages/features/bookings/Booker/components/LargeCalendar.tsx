import { useMemo, useEffect } from "react";

import dayjs from "@calcom/dayjs";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import type { CalendarAvailableTimeslots } from "@calcom/features/calendars/weeklyview/types/state";
import { localStorage } from "@calcom/lib/webstorage";

import { useBookerStore } from "../store";
import type { useScheduleForEventReturnType } from "../utils/event";
import { getQueryParam } from "../utils/query-param";

export const LargeCalendar = ({
  extraDays,
  schedule,
  isLoading,
  event,
}: {
  extraDays: number;
  schedule?: useScheduleForEventReturnType["data"];
  isLoading: boolean;
  event: {
    data?: Pick<BookerEvent, "length"> | null;
  };
}) => {
  const selectedDate = useBookerStore((state) => state.selectedDate);
  const setSelectedTimeslot = useBookerStore((state) => state.setSelectedTimeslot);
  const selectedEventDuration = useBookerStore((state) => state.selectedDuration);
  const displayOverlay =
    getQueryParam("overlayCalendar") === "true" || localStorage?.getItem("overlayCalendarSwitchDefault");

  const eventDuration = selectedEventDuration || event?.data?.length || 30;

  const availableSlots = useMemo(() => {
    const availableTimeslots: CalendarAvailableTimeslots = {};
    if (!schedule) return availableTimeslots;
    if (!schedule.slots) return availableTimeslots;

    for (const day in schedule.slots) {
      availableTimeslots[day] = schedule.slots[day].map((slot) => {
        const { time, ...rest } = slot;
        return {
          start: dayjs(time).toDate(),
          end: dayjs(time).add(eventDuration, "minutes").toDate(),
          ...rest,
        };
      });
    }

    return availableTimeslots;
  }, [schedule, eventDuration]);

  const startDate = selectedDate ? dayjs(selectedDate).toDate() : dayjs().toDate();
  const endDate = dayjs(startDate)
    .add(extraDays - 1, "day")
    .toDate();

  // HACK: force rerender when overlay events change
  // Sine we dont use react router here we need to force rerender (ATOM SUPPORT)
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  useEffect(() => {}, [displayOverlay]);

  return (
    <div className="h-full [--calendar-dates-sticky-offset:66px]">
      <Calendar
        isPending={isLoading}
        availableTimeslots={availableSlots}
        startHour={0}
        endHour={23}
        events={[]}
        startDate={startDate}
        endDate={endDate}
        onEmptyCellClick={(date) => setSelectedTimeslot(date.toISOString())}
        gridCellsPerHour={60 / eventDuration}
        hoverEventDuration={eventDuration}
        hideHeader
      />
    </div>
  );
};
