import type { Prisma } from "@prisma/client";
import z from "zod";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { DailyLocationType } from "@calcom/core/location";
import { deleteWebhookScheduledTriggers } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { prisma } from "@calcom/prisma";
import { AppCategories } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { EventTypeAppMetadataSchema } from "@calcom/prisma/zod-utils";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/prisma/zod-utils";
import { EventTypeMetaDataSchema, eventTypeAppMetadataOptionalSchema } from "@calcom/prisma/zod-utils";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";

type App = {
  slug: string;
  categories: AppCategories[];
  dirName: string;
} | null;

const isVideoOrConferencingApp = (app: App) =>
  app?.categories.includes(AppCategories.video) || app?.categories.includes(AppCategories.conferencing);

const getRemovedIntegrationNameFromAppSlug = (slug: string) =>
  slug === "msteams" ? "office365_video" : slug.split("-")[0];

const locationsSchema = z.array(z.object({ type: z.string() }));
type TlocationsSchema = z.infer<typeof locationsSchema>;

const handleDeleteCredential = async ({
  userId,
  userMetadata,
  credentialId,
  teamId,
}: {
  userId: number;
  userMetadata?: Prisma.JsonValue;
  credentialId: number;
  teamId?: number;
}) => {
  const credential = await prisma.credential.findFirst({
    where: {
      id: credentialId,
      ...(teamId ? { teamId } : { userId }),
    },
    select: {
      ...credentialForCalendarServiceSelect,
      app: {
        select: {
          slug: true,
          categories: true,
          dirName: true,
        },
      },
    },
  });

  if (!credential) {
    throw new Error("Credential not found");
  }

  const eventTypes = await prisma.eventType.findMany({
    where: {
      OR: [
        {
          ...(teamId ? { teamId } : { userId }),
        },
        // for managed events
        {
          parent: {
            teamId,
          },
        },
      ],
    },
    select: {
      id: true,
      locations: true,
      destinationCalendar: {
        include: {
          credential: true,
        },
      },
      price: true,
      currency: true,
      metadata: true,
    },
  });

  // TODO: Improve this uninstallation cleanup per event by keeping a relation of EventType to App which has the data.
  for (const eventType of eventTypes) {
    // If it's a video, replace the location with Cal video
    if (eventType.locations && isVideoOrConferencingApp(credential.app)) {
      // Find the user's event types

      const integrationQuery = getRemovedIntegrationNameFromAppSlug(credential.app?.slug ?? "");

      // Check if the event type uses the deleted integration

      // To avoid type errors, need to stringify and parse JSON to use array methods
      const locations = locationsSchema.parse(eventType.locations);

      const doesDailyVideoAlreadyExists = locations.some((location) =>
        location.type.includes(DailyLocationType)
      );

      const updatedLocations: TlocationsSchema = locations.reduce((acc: TlocationsSchema, location) => {
        if (location.type.includes(integrationQuery)) {
          if (!doesDailyVideoAlreadyExists) acc.push({ type: DailyLocationType });
        } else {
          acc.push(location);
        }
        return acc;
      }, []);

      await prisma.eventType.update({
        where: {
          id: eventType.id,
        },
        data: {
          locations: updatedLocations,
        },
      });
    }

    // If it's a calendar, remove the destination calendar from the event type
    if (
      credential.app?.categories.includes(AppCategories.calendar) &&
      eventType.destinationCalendar?.credential?.appId === credential.appId
    ) {
      const destinationCalendar = await prisma.destinationCalendar.findFirst({
        where: {
          id: eventType.destinationCalendar?.id,
        },
      });

      if (destinationCalendar) {
        await prisma.destinationCalendar.delete({
          where: {
            id: destinationCalendar.id,
          },
        });
      }
    }

    if (credential.app?.categories.includes(AppCategories.crm)) {
      const metadata = EventTypeMetaDataSchema.parse(eventType.metadata);
      const appSlugToDelete = credential.app?.slug;
      const apps = eventTypeAppMetadataOptionalSchema.parse(metadata?.apps);
      if (appSlugToDelete) {
        const appMetadata = removeAppFromEventTypeMetadata(appSlugToDelete, {
          apps,
        });

        await prisma.$transaction(async () => {
          await prisma.eventType.update({
            where: {
              id: eventType.id,
            },
            data: {
              hidden: true,
              metadata: {
                ...metadata,
                apps: {
                  ...appMetadata,
                },
              },
            },
          });
        });
      }
    }

    const metadata = eventTypeMetaDataSchemaWithTypedApps.parse(eventType.metadata);
    const appSlug = credential.app?.slug;
    if (appSlug) {
      await prisma.eventType.update({
        where: {
          id: eventType.id,
        },
        data: {
          hidden: true,
          metadata: {
            ...metadata,
            apps: {
              ...metadata?.apps,
              [appSlug]: undefined,
            },
          },
        },
      });
    }
  }

  // if zapier get disconnected, delete zapier apiKey, delete zapier webhooks and cancel all scheduled jobs from zapier
  if (credential.app?.slug === "zapier") {
    await prisma.apiKey.deleteMany({
      where: {
        userId: userId,
        appId: "zapier",
      },
    });
    await prisma.webhook.deleteMany({
      where: {
        userId: userId,
        appId: "zapier",
      },
    });

    deleteWebhookScheduledTriggers({
      appId: credential.appId,
      userId: teamId ? undefined : userId,
      teamId,
    });
  }

  let metadata = userMetadataSchema.parse(userMetadata);

  if (credential.app?.slug === metadata?.defaultConferencingApp?.appSlug) {
    metadata = {
      ...metadata,
      defaultConferencingApp: undefined,
    };
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        metadata,
      },
    });
  }

  // Backwards compatibility. Selected calendars cascade on delete when deleting a credential
  // If it's a calendar remove it from the SelectedCalendars
  if (credential.app?.categories.includes(AppCategories.calendar)) {
    try {
      const calendar = await getCalendar(credential);

      const calendars = await calendar?.listCalendars();

      const calendarIds = calendars?.map((cal) => cal.externalId);

      await prisma.selectedCalendar.deleteMany({
        where: {
          userId: userId,
          integration: credential.type as string,
          externalId: {
            in: calendarIds,
          },
        },
      });
    } catch (error) {
      console.warn(
        `Error deleting selected calendars for userId: ${userId} integration: ${credential.type}`,
        error
      );
    }
  }

  // Validated that credential is user's above
  await prisma.credential.delete({
    where: {
      id: credentialId,
    },
  });
};

const removeAppFromEventTypeMetadata = (
  appSlugToDelete: string,
  eventTypeMetadata: {
    apps: z.infer<typeof eventTypeAppMetadataOptionalSchema>;
  }
) => {
  const appMetadata = eventTypeMetadata?.apps
    ? Object.entries(eventTypeMetadata.apps).reduce((filteredApps, [appName, appData]) => {
        if (appName !== appSlugToDelete) {
          filteredApps[appName as keyof typeof eventTypeMetadata.apps] = appData;
        }
        return filteredApps;
      }, {} as z.infer<typeof EventTypeAppMetadataSchema>)
    : {};

  return appMetadata;
};

export default handleDeleteCredential;
