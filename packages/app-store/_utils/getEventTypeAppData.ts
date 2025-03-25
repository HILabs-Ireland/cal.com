import type { z } from "zod";

import type { BookerEvent } from "@calcom/features/bookings/types";
import type { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/prisma/zod-utils";

export type EventTypeApps = NonNullable<
  NonNullable<z.infer<typeof eventTypeMetaDataSchemaWithTypedApps>>["apps"]
>;
export type EventTypeAppsList = keyof EventTypeApps;

export const getEventTypeAppData = <T extends EventTypeAppsList>(
  eventType: Pick<BookerEvent, "metadata">,
  appId: T,
  forcedGet?: boolean
): EventTypeApps[T] => {
  const metadata = eventType.metadata;
  const appMetadata = metadata?.apps && metadata.apps[appId];
  if (appMetadata) {
    const allowDataGet = forcedGet ? true : appMetadata.enabled;
    return allowDataGet
      ? {
          ...appMetadata,
          // trackingId is legacy way to store value for TRACKING_ID. So, we need to support both.
          TRACKING_ID: appMetadata.TRACKING_ID || appMetadata.trackingId || null,
        }
      : null;
  }
  // Backward compatibility for existing event types.
  // TODO: After the new AppStore EventType App flow is stable, write a migration to migrate metadata to new format which will let us remove this compatibility code
  // Migration isn't being done right now, to allow a revert if needed
  const legacyAppsData = {
    giphy: {
      enabled: !!eventType.metadata?.giphyThankYouPage,
      thankYouPage: eventType.metadata?.giphyThankYouPage || "",
    },
  } as const;

  // TODO: This assertion helps typescript hint that only one of the app's data can be returned
  const legacyAppData = legacyAppsData[appId as Extract<T, keyof typeof legacyAppsData>];
  const allowDataGet = forcedGet ? true : legacyAppData?.enabled;
  return allowDataGet ? legacyAppData : null;
};
