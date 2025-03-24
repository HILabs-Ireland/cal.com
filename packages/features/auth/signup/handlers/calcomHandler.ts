/* eslint-disable @calcom/eslint/no-prisma-include-true */

/* eslint-disable @typescript-eslint/no-unused-vars */
import type { NextApiResponse } from "next";

import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { createOrUpdateMemberships } from "@calcom/features/auth/signup/utils/createOrUpdateMemberships";
import { prefillAvatar } from "@calcom/features/auth/signup/utils/prefillAvatar";
import { checkIfEmailIsBlockedInWatchlistController } from "@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller";
import { getLocaleFromRequest } from "@calcom/lib/getLocaleFromRequest";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { usernameHandler, type RequestWithUsernameStatus } from "@calcom/lib/server/username";
import { validateAndGetCorrectedUsernameAndEmail } from "@calcom/lib/validateUsername";
import { prisma } from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import { signupSchema } from "@calcom/prisma/zod-utils";

import { joinAnyChildTeamOnOrgInvite } from "../utils/organization";
import {
  findTokenByToken,
  throwIfTokenExpired,
  validateAndGetCorrectedUsernameForTeam,
} from "../utils/token";

const log = logger.getSubLogger({ prefix: ["signupCalcomHandler"] });

async function handler(req: RequestWithUsernameStatus, res: NextApiResponse) {
  const {
    email: _email,
    password,
    token,
  } = signupSchema
    .pick({
      email: true,
      password: true,
      token: true,
    })
    .parse(req.body);

  const shouldLockByDefault = await checkIfEmailIsBlockedInWatchlistController(_email);

  log.debug("handler", { email: _email });

  let username: string | null = req.usernameStatus.requestedUserName;

  // Check for premium username
  if (req.usernameStatus.statusCode === 418) {
    return res.status(req.usernameStatus.statusCode).json(req.usernameStatus.json);
  }

  // Validate the user
  if (!username) {
    throw new HttpError({
      statusCode: 422,
      message: "Invalid username",
    });
  }

  const email = _email.toLowerCase();

  let foundToken: { id: number; teamId: number | null; expires: Date } | null = null;
  if (token) {
    foundToken = await findTokenByToken({ token });
    throwIfTokenExpired(foundToken?.expires);
    username = await validateAndGetCorrectedUsernameForTeam({
      username,
      email,
      teamId: foundToken?.teamId ?? null,
      isSignup: true,
    });
  } else {
    const usernameAndEmailValidation = await validateAndGetCorrectedUsernameAndEmail({
      username,
      email,
      isSignup: true,
    });
    if (!usernameAndEmailValidation.isValid) {
      throw new HttpError({
        statusCode: 409,
        message: "Username or email is already taken",
      });
    }

    if (!usernameAndEmailValidation.username) {
      throw new HttpError({
        statusCode: 422,
        message: "Invalid username",
      });
    }

    username = usernameAndEmailValidation.username;
  }

  // Hash the password
  const hashedPassword = await hashPassword(password);

  if (foundToken && foundToken?.teamId) {
    const team = await prisma.team.findUnique({
      where: {
        id: foundToken.teamId,
      },
      include: {
        parent: {
          select: {
            id: true,
            slug: true,
            organizationSettings: true,
          },
        },
        organizationSettings: true,
      },
    });
    if (team) {
      const user = await prisma.user.upsert({
        where: { email },
        update: {
          username,
          emailVerified: new Date(Date.now()),
          identityProvider: IdentityProvider.CAL,
          password: {
            upsert: {
              create: { hash: hashedPassword },
              update: { hash: hashedPassword },
            },
          },
        },
        create: {
          username,
          email,
          identityProvider: IdentityProvider.CAL,
          password: { create: { hash: hashedPassword } },
        },
      });
      // Wrapping in a transaction as if one fails we want to rollback the whole thing to preventa any data inconsistencies
      const { membership } = await createOrUpdateMemberships({
        user,
        team,
      });

      // Accept any child team invites for orgs.
      if (team.parent) {
        await joinAnyChildTeamOnOrgInvite({
          userId: user.id,
          org: team.parent,
        });
      }
    }

    // Cleanup token after use
    await prisma.verificationToken.delete({
      where: {
        id: foundToken.id,
      },
    });
  } else {
    // Create the user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        locked: shouldLockByDefault,
        password: { create: { hash: hashedPassword } },
      },
    });
    if (process.env.AVATARAPI_USERNAME && process.env.AVATARAPI_PASSWORD) {
      await prefillAvatar({ email });
    }
    sendEmailVerification({
      email,
      language: await getLocaleFromRequest(req),
      username: username || "",
    });
  }

  if (checkoutSessionId) {
    console.log("Created user but missing payment", checkoutSessionId);
    return res.status(402).json({
      message: "Created user but missing payment",
      checkoutSessionId,
    });
  }

  return res.status(201).json({ message: "Created user" });
}

export default usernameHandler(handler);
