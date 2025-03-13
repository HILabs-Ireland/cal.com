import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { THasActiveTeamPlanSchema } from "./hasActiveTeamPlan.schema";

type HasActiveTeamPlanOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: THasActiveTeamPlanSchema;
};

export const hasActiveTeamPlanHandler = async ({ input, ctx }: HasActiveTeamPlanOptions) => {
  if (IS_SELF_HOSTED) return true;

  if (!input.teamId) return false;

  const userId = ctx.user.id;

  //   Check if the user is a member of the requested team
  const team = await prisma.team.findFirst({
    where: {
      id: input.teamId,
      members: {
        some: {
          userId: userId,
          accepted: true,
        },
      },
    },
  });
  if (!team) return false;

  if (!teams.length) return false;

  return false;
};

export default hasActiveTeamPlanHandler;
