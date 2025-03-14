import { z } from "zod";

import slugify from "@calcom/lib/slugify";
<<<<<<< HEAD
=======
import { CreationSource } from "@calcom/prisma/enums";
>>>>>>> eb7546b337 (Remove remaining billing mentions)

export const ZCreateInputSchema = z.object({
  name: z.string(),
  slug: z.string().transform((val) => slugify(val.trim())),
  orgOwnerEmail: z.string().email(),
  language: z.string().optional(),
  seats: z.number().optional(),
  pricePerSeat: z.number().optional(),
  isPlatform: z.boolean().default(false),
<<<<<<< HEAD
=======
  creationSource: z.nativeEnum(CreationSource),
>>>>>>> eb7546b337 (Remove remaining billing mentions)
});

export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
