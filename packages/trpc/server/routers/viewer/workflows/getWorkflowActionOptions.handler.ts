import { getWorkflowActionOptions } from "@calcom/features/ee/workflows/lib/getOptions";
import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type GetWorkflowActionOptionsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser> & {
      locale: string;
    };
  };
};

export const getWorkflowActionOptionsHandler = async ({ ctx }: GetWorkflowActionOptionsOptions) => {
  const { user } = ctx;

  const hasOrgsPlan = !!user.profile?.organizationId;

  const t = await getTranslation(ctx.user.locale, "common");
  return getWorkflowActionOptions(t, IS_SELF_HOSTED, IS_SELF_HOSTED || hasOrgsPlan);
};
