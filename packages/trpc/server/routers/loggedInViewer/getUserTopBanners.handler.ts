import { getCalendarCredentials, getConnectedCalendars } from "@calcom/core/CalendarManager";
import { prisma } from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { checkInvalidAppCredentials } from "./checkForInvalidAppCredentials";
import { shouldVerifyEmailHandler } from "./shouldVerifyEmail.handler";

type Props = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

const checkInvalidGoogleCalendarCredentials = async ({ ctx }: Props) => {
  const userCredentials = await prisma.credential.findMany({
    where: {
      userId: ctx.user.id,
      type: "google_calendar",
    },
    select: credentialForCalendarServiceSelect,
  });

  const calendarCredentials = getCalendarCredentials(userCredentials);

  const { connectedCalendars } = await getConnectedCalendars(
    calendarCredentials,
    ctx.user.userLevelSelectedCalendars,
    ctx.user.destinationCalendar?.externalId
  );

  return connectedCalendars.some((calendar) => !!calendar.error);
};

export const getUserTopBannersHandler = async ({ ctx }: Props) => {
  const shouldEmailVerify = shouldVerifyEmailHandler({ ctx });
  const isInvalidCalendarCredential = checkInvalidGoogleCalendarCredentials({ ctx });
  const appsWithInavlidCredentials = checkInvalidAppCredentials({ ctx });

  const [verifyEmailBanner, calendarCredentialBanner, invalidAppCredentialBanners] = await Promise.allSettled(
    [shouldEmailVerify, isInvalidCalendarCredential, appsWithInavlidCredentials]
  );

  return {
    verifyEmailBanner: verifyEmailBanner.status === "fulfilled" ? !verifyEmailBanner.value.isVerified : false,
    calendarCredentialBanner:
      calendarCredentialBanner.status === "fulfilled" ? calendarCredentialBanner.value : false,
    invalidAppCredentialBanners:
      invalidAppCredentialBanners.status === "fulfilled" ? invalidAppCredentialBanners.value : [],
  };
};
