import { getWorkflowActionOptions } from "@calcom/features/ee/workflows/lib/getOptions";
import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { hasTeamPlanHandler } from "../teams/hasTeamPlan.handler";

type GetWorkflowActionOptionsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser> & {
      locale: string;
    };
  };
};

export const getWorkflowActionOptionsHandler = async ({ ctx }: GetWorkflowActionOptionsOptions) => {
  const { user } = ctx;

  let isTeamsPlan = false;
  const { hasTeamPlan } = await hasTeamPlanHandler({ ctx });
  isTeamsPlan = !!hasTeamPlan;

  const hasOrgsPlan = !!user.profile?.organizationId;

  const t = await getTranslation(ctx.user.locale, "common");
  return getWorkflowActionOptions(t, IS_SELF_HOSTED || isTeamsPlan, IS_SELF_HOSTED || hasOrgsPlan);
};
