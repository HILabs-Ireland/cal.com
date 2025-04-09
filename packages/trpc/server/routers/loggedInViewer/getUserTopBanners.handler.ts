import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { checkInvalidAppCredentials } from "./checkForInvalidAppCredentials";
import { shouldVerifyEmailHandler } from "./shouldVerifyEmail.handler";

type Props = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getUserTopBannersHandler = async ({ ctx }: Props) => {
  const shouldEmailVerify = shouldVerifyEmailHandler({ ctx });
  const appsWithInavlidCredentials = checkInvalidAppCredentials({ ctx });

  const [verifyEmailBanner, invalidAppCredentialBanners] = await Promise.allSettled([
    shouldEmailVerify,
    ,
    appsWithInavlidCredentials,
  ]);

  return {
    verifyEmailBanner: verifyEmailBanner.status === "fulfilled" ? !verifyEmailBanner.value.isVerified : false,
    calendarCredentialBanner: false,
    invalidAppCredentialBanners:
      invalidAppCredentialBanners.status === "fulfilled" ? invalidAppCredentialBanners.value : [],
  };
};
