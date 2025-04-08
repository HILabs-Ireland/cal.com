import { TimeUnit } from "@calcom/prisma/enums";

export const TIME_UNIT = [TimeUnit.DAY, TimeUnit.HOUR, TimeUnit.MINUTE] as const;
