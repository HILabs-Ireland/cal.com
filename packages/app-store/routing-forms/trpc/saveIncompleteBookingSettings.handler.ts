import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
import { TRPCError } from "@calcom/trpc/server";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TSaveIncompleteBookingSettingsInputSchema } from "./saveIncompleteBookingSettings.schema";

const log = logger.getSubLogger({ prefix: ["incomplete-booking"] });

interface SaveIncompleteBookingSettingsOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSaveIncompleteBookingSettingsInputSchema;
}

const saveIncompleteBookingSettingsHandler = async (options: SaveIncompleteBookingSettingsOptions) => {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Action data schema not found",
  });
};

export default saveIncompleteBookingSettingsHandler;
