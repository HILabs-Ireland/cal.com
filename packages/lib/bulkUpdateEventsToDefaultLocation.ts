import type { PrismaClient } from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";

export const bulkUpdateEventsToDefaultLocation = async ({
  eventTypeIds,
  user,
  prisma,
}: {
  eventTypeIds: number[];
  user: Pick<User, "id" | "metadata">;
  prisma: PrismaClient;
}) => {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Default conferencing app not set",
  });
};
