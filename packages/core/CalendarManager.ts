// eslint-disable-next-line no-restricted-imports
import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import dayjs from "@calcom/dayjs";
import { getUid } from "@calcom/lib/CalEventParser";
import logger from "@calcom/lib/logger";
import { getPiiFreeCalendarEvent, getPiiFreeCredential } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import type {
  CalendarEvent,
  EventBusyDate,
  NewCalendarEventType,
  SelectedCalendar,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import getCalendarsEvents from "./getCalendarsEvents";
import { getCalendarsEventsWithTimezones } from "./getCalendarsEvents";

const log = logger.getSubLogger({ prefix: ["CalendarManager"] });

export const getCalendarCredentials = (credentials: Array<CredentialPayload>) => {
  return [];
};

export const getBusyCalendarTimes = async (
  withCredentials: CredentialPayload[],
  dateFrom: string,
  dateTo: string,
  selectedCalendars: SelectedCalendar[],
  shouldServeCache?: boolean,
  includeTimeZone?: boolean
) => {
  let results: (EventBusyDate & { timeZone?: string })[][] = [];
  // const months = getMonths(dateFrom, dateTo);
  try {
    // Subtract 11 hours from the start date to avoid problems in UTC- time zones.
    const startDate = dayjs(dateFrom).subtract(11, "hours").format();
    // Add 14 hours from the start date to avoid problems in UTC+ time zones.
    const endDate = dayjs(dateTo).endOf("month").add(14, "hours").format();

    if (includeTimeZone) {
      results = await getCalendarsEventsWithTimezones(withCredentials, startDate, endDate, selectedCalendars);
    } else {
      results = await getCalendarsEvents(
        withCredentials,
        startDate,
        endDate,
        selectedCalendars,
        shouldServeCache
      );
    }
  } catch (e) {
    log.warn(safeStringify(e));
  }
  return results.reduce((acc, availability) => acc.concat(availability), []);
};

export const createEvent = async (
  credential: CredentialPayload,
  calEvent: CalendarEvent,
  externalId?: string
): Promise<any> => {
  const uid: string = getUid(calEvent);
  const calendar = await getCalendar(credential);
  let success = true;
  let calError: string | undefined = undefined;

  log.debug(
    "Creating calendar event",
    safeStringify({
      calEvent: getPiiFreeCalendarEvent(calEvent),
    })
  );
  // Check if the disabledNotes flag is set to true
  if (calEvent.hideCalendarNotes) {
    calEvent.additionalNotes = "Notes have been hidden by the organizer"; // TODO: i18n this string?
  }

  // TODO: Surface success/error messages coming from apps to improve end user visibility
  const creationResult = calendar
    ? await calendar
        .createEvent(calEvent, credential.id)
        .catch(async (error: { code: number; calError: string }) => {
          success = false;
          /**
           * There is a time when selectedCalendar externalId doesn't match witch certain credential
           * so google returns 404.
           * */
          if (error?.code === 404) {
            return undefined;
          }
          if (error?.calError) {
            calError = error.calError;
          }
          log.error(
            "createEvent failed",
            safeStringify({ error, calEvent: getPiiFreeCalendarEvent(calEvent) })
          );
          // @TODO: This code will be off till we can investigate an error with it
          //https://github.com/calcom/cal.com/issues/3949
          // await sendBrokenIntegrationEmail(calEvent, "calendar");
          return undefined;
        })
    : undefined;
  if (!creationResult) {
    logger.error(
      "createEvent failed",
      safeStringify({
        success,
        uid,
        creationResult,
        originalEvent: getPiiFreeCalendarEvent(calEvent),
        calError,
      })
    );
  }
  log.debug(
    "Created calendar event",
    safeStringify({
      calEvent: getPiiFreeCalendarEvent(calEvent),
      creationResult,
    })
  );
  return {
    appName: credential.appId || "",
    type: credential.type,
    success,
    uid,
    iCalUID: creationResult?.iCalUID || undefined,
    createdEvent: creationResult,
    originalEvent: calEvent,
    calError,
    calWarnings: creationResult?.additionalInfo?.calWarnings || [],
    externalId,
    credentialId: credential.id,
  };
};

export const updateEvent = async (
  credential: CredentialPayload,
  calEvent: CalendarEvent,
  bookingRefUid: string | null,
  externalCalendarId: string | null
): Promise<any> => {
  const uid = getUid(calEvent);
  const calendar = await getCalendar(credential);
  let success = false;
  let calError: string | undefined = undefined;
  let calWarnings: string[] | undefined = [];
  log.debug(
    "Updating calendar event",
    safeStringify({
      bookingRefUid,
      calEvent: getPiiFreeCalendarEvent(calEvent),
    })
  );
  if (bookingRefUid === "") {
    log.error(
      "updateEvent failed",
      "bookingRefUid is empty",
      safeStringify({ calEvent: getPiiFreeCalendarEvent(calEvent) })
    );
  }
  const updatedResult: NewCalendarEventType | NewCalendarEventType[] | undefined =
    calendar && bookingRefUid
      ? await calendar
          .updateEvent(bookingRefUid, calEvent, externalCalendarId)
          .then((event: NewCalendarEventType | NewCalendarEventType[]) => {
            success = true;
            return event;
          })
          .catch(async (e: { calError: string }) => {
            // @TODO: This code will be off till we can investigate an error with it
            // @see https://github.com/calcom/cal.com/issues/3949
            // await sendBrokenIntegrationEmail(calEvent, "calendar");
            log.error(
              "updateEvent failed",
              safeStringify({ e, calEvent: getPiiFreeCalendarEvent(calEvent) })
            );
            if (e?.calError) {
              calError = e.calError;
            }
            return undefined;
          })
      : undefined;

  if (!updatedResult) {
    logger.error(
      "updateEvent failed",
      safeStringify({
        success,
        bookingRefUid,
        credential: getPiiFreeCredential(credential),
        originalEvent: getPiiFreeCalendarEvent(calEvent),
        calError,
      })
    );
  }

  if (Array.isArray(updatedResult)) {
    calWarnings = updatedResult.flatMap((res) => res.additionalInfo?.calWarnings ?? []);
  } else {
    calWarnings = updatedResult?.additionalInfo?.calWarnings || [];
  }

  return {
    appName: credential.appId || "",
    type: credential.type,
    success,
    uid,
    updatedEvent: updatedResult,
    originalEvent: calEvent,
    calError,
    calWarnings,
  };
};

export const deleteEvent = async ({
  credential,
  bookingRefUid,
  event,
  externalCalendarId,
}: {
  credential: CredentialPayload;
  bookingRefUid: string;
  event: CalendarEvent;
  externalCalendarId?: string | null;
}): Promise<unknown> => {
  const calendar = await getCalendar(credential);
  log.debug(
    "Deleting calendar event",
    safeStringify({
      bookingRefUid,
      event: getPiiFreeCalendarEvent(event),
    })
  );
  if (calendar) {
    return calendar.deleteEvent(bookingRefUid, event, externalCalendarId);
  } else {
    log.error(
      "Could not do deleteEvent - No calendar adapter found",
      safeStringify({
        credential: getPiiFreeCredential(credential),
        event,
      })
    );
  }

  return Promise.resolve({});
};
