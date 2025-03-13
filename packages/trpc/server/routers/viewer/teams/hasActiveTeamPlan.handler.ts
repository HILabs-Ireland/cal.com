import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type HasActiveTeamPlanOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const hasActiveTeamPlanHandler = async ({ ctx }: HasActiveTeamPlanOptions) => {
  if (IS_SELF_HOSTED) return true;
  const teams = await prisma.team.findMany({
    where: {
      members: {
        some: {
          userId: ctx.user.id,
          accepted: true,
        },
      },
    },
  });

  if (!teams.length) return false;

  return false;
};

export default hasActiveTeamPlanHandler;
