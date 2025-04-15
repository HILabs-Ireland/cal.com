import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { checkUsername } from "@calcom/lib/server/checkUsername";

type Response = {
  available: boolean;
};

const bodySchema = z.object({
  username: z.string(),
  orgSlug: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse<Response>): Promise<void> {
  const { username } = bodySchema.parse(req.body);
  const result = await checkUsername(username);
  return res.status(200).json(result);
}
