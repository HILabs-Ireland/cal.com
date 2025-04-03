/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { WEBAPP_URL } from "@calcom/lib/constants";
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { prisma } from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";

type PublishOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const publishHandler = async ({ ctx }: PublishOptions) => {
  const orgId = ctx.user.organizationId;
  if (!orgId) throw new TRPCError({ code: "UNAUTHORIZED", message: "You do not have an organization" });

  if (!(await isOrganisationAdmin(ctx.user.id, orgId!))) throw new TRPCError({ code: "UNAUTHORIZED" });

  const prevTeam = await prisma.team.findFirst({
    where: {
      id: orgId,
    },
    include: { members: true },
  });

  if (!prevTeam) throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found." });

  const metadata = teamMetadataSchema.safeParse(prevTeam.metadata);
  if (!metadata.success) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid team metadata" });

  if (!metadata.data?.requestedSlug) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Can't publish organization without `requestedSlug`",
    });
  }

  const { requestedSlug, ...newMetadata } = metadata.data;
  let updatedTeam: Awaited<ReturnType<typeof prisma.team.update>>;

  try {
    updatedTeam = await prisma.team.update({
      where: { id: orgId! },
      data: {
        slug: requestedSlug,
        metadata: { ...newMetadata },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update team";
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
  }

  return {
    url: `${WEBAPP_URL}/settings/organization/profile`,
    message: "Team published successfully",
  };
};

export default publishHandler;
