import type { NextApiResponse } from "next";

import selfHostedSignupHandler from "@calcom/feature-auth/signup/handlers/selfHostedHandler";
import { type RequestWithUsernameStatus } from "@calcom/features/auth/signup/username";
import { getFeatureFlag } from "@calcom/features/flags/server/utils";
import getIP from "@calcom/lib/getIP";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { checkCfTurnstileToken } from "@calcom/lib/server/checkCfTurnstileToken";
import { signupSchema } from "@calcom/prisma/zod-utils";

async function ensureSignupIsEnabled(req: RequestWithUsernameStatus) {
  const { token } = signupSchema
    .pick({
      token: true,
    })
    .parse(req.body);

  // Still allow signups if there is a team invite
  if (token) return;

  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const signupDisabled = await getFeatureFlag(prisma, "disable-signup");

  if (process.env.NEXT_PUBLIC_DISABLE_SIGNUP === "true" || signupDisabled) {
    throw new HttpError({
      statusCode: 403,
      message: "Signup is disabled",
    });
  }
}

function ensureReqIsPost(req: RequestWithUsernameStatus) {
  if (req.method !== "POST") {
    throw new HttpError({
      statusCode: 405,
      message: "Method not allowed",
    });
  }
}

export default async function handler(req: RequestWithUsernameStatus, res: NextApiResponse) {
  const remoteIp = getIP(req);
  // Use a try catch instead of returning res every time
  try {
    await checkCfTurnstileToken({
      token: req.headers["cf-access-token"] as string,
      remoteIp,
    });

    ensureReqIsPost(req);
    await ensureSignupIsEnabled(req);

    return await selfHostedSignupHandler(req, res);
  } catch (e) {
    if (e instanceof HttpError) {
      return res.status(e.statusCode).json({ message: e.message });
    }
    logger.error(e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
