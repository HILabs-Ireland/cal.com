import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import type { Prisma } from ".prisma/client";

const getEventTypeAppMetadata = (metadata: Prisma.JsonValue) => {
  const eventTypeMetadataParse = EventTypeMetaDataSchema.safeParse(metadata);

  if (!eventTypeMetadataParse.success || !eventTypeMetadataParse.data) return;

  const eventTypeAppMetadata: Record<string, any> = {};

  return eventTypeAppMetadata;
};

export default getEventTypeAppMetadata;
