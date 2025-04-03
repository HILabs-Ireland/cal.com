import { z } from "zod";

import { emailSchema } from "@calcom/lib/emailSchema";

export const ZCreateSelfHostedLicenseSchema = z.object({
  entityCount: z.number().int().nonnegative(),
  overages: z.number().nonnegative(),
  email: emailSchema,
});

export type TCreateSelfHostedLicenseSchema = z.infer<typeof ZCreateSelfHostedLicenseSchema>;
