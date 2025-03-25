import { sendVerificationCode } from "@calcom/features/ee/workflows/lib/reminders/verifyPhoneNumber";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import { hasTeamPlanHandler } from "../teams/hasTeamPlan.handler";
import type { TSendVerificationCodeInputSchema } from "./sendVerificationCode.schema";

type SendVerificationCodeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSendVerificationCodeInputSchema;
};

export const sendVerificationCodeHandler = async ({ ctx, input }: SendVerificationCodeOptions) => {
  let isTeamsPlan = false;
  const { hasTeamPlan } = await hasTeamPlanHandler({ ctx });
  isTeamsPlan = !!hasTeamPlan;

  if (!isTeamsPlan) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const { phoneNumber } = input;
  return sendVerificationCode(phoneNumber);
};
