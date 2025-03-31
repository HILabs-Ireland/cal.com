import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import notEmpty from "@calcom/lib/notEmpty";
import { generateUsernameSuggestion } from "@calcom/lib/server/username";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";

export type RequestWithUsernameStatus = NextApiRequest & {
  usernameStatus: {
    /**
     * ```text
     * 200: Username is available
     * 402: Pro username, must be purchased
     * 418: A user exists with that username
     * ```
     */
    statusCode: 200 | 402 | 418;
    requestedUserName: string;
    json: {
      available: boolean;
      message?: string;
      suggestion?: string;
    };
  };
};
export const usernameStatusSchema = z.object({
  statusCode: z.union([z.literal(200), z.literal(402), z.literal(418)]),
  requestedUserName: z.string(),
  json: z.object({
    available: z.boolean(),
    message: z.string().optional(),
    suggestion: z.string().optional(),
  }),
});

type CustomNextApiHandler<T = unknown> = (
  req: RequestWithUsernameStatus,
  res: NextApiResponse<T>
) => void | Promise<void>;

const usernameHandler =
  (handler: CustomNextApiHandler) =>
  async (req: RequestWithUsernameStatus, res: NextApiResponse): Promise<void> => {
    const username = slugify(req.body.username);
    const check = await usernameCheck(username);

    req.usernameStatus = {
      statusCode: 200,
      requestedUserName: username,
      json: {
        available: true,
        message: "Username is available",
      },
    };

    if (!check.available) {
      req.usernameStatus.statusCode = 418;
      req.usernameStatus.json.available = false;
      req.usernameStatus.json.message = "A user exists with that username";
    }

    req.usernameStatus.json.suggestion = check.suggestedUsername;

    return handler(req, res);
  };

const usernameCheck = async (usernameRaw: string) => {
  const response = {
    available: true,
    suggestedUsername: "",
  };

  const username = slugify(usernameRaw);

  const user = await prisma.user.findFirst({
    where: {
      username,
      // Simply remove it when we drop organizationId column
      organizationId: null,
    },
    select: {
      username: true,
    },
  });

  if (user) {
    response.available = false;
  }

  // get list of similar usernames in the db
  const users = await prisma.user.findMany({
    where: {
      username: {
        contains: username,
      },
    },
    select: {
      username: true,
    },
  });

  // We only need suggestedUsername if the username is not available
  if (!response.available) {
    response.suggestedUsername = await generateUsernameSuggestion(
      users.map((user) => user.username).filter(notEmpty),
      username
    );
  }

  return response;
};

export { usernameHandler, usernameCheck };
