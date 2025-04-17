import { uploadLogo } from "@calcom/lib/server/avatar";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateInputSchema } from "./create.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateInputSchema;
};

export const createHandler = async ({ ctx, input }: CreateOptions) => {
  const { user } = ctx;
  const { slug, name } = input;
  const isOrgChildTeam = !!user.profile?.organizationId;

  // For orgs we want to create teams under the org
  if (user.profile?.organizationId && !user.organization.isOrgAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "org_admins_can_create_new_teams" });
  }

  const slugCollisions = await prisma.team.findFirst({
    where: {
      slug: slug,
      // If this is under an org, check that the team doesn't already exist
      parentId: isOrgChildTeam ? user.profile?.organizationId : null,
    },
  });

  if (slugCollisions) throw new TRPCError({ code: "BAD_REQUEST", message: "team_url_taken" });

  if (user.profile?.organizationId) {
    const nameCollisions = await isSlugTakenBySomeUserInTheOrganization({
      organizationId: user.profile?.organizationId,
      slug: slug,
    });

    if (nameCollisions) throw new TRPCError({ code: "BAD_REQUEST", message: "team_slug_exists_as_user" });
  }

  const createdTeam = await prisma.team.create({
    data: {
      slug,
      name,
      members: {
        create: {
          userId: ctx.user.id,
          role: MembershipRole.OWNER,
          accepted: true,
        },
      },
      ...(isOrgChildTeam && { parentId: user.profile?.organizationId }),
    },
  });
  // Upload logo, create doesn't allow logo removal
  if (input.logo && input.logo.startsWith("data:image/png;base64,")) {
    const logoUrl = await uploadLogo({
      logo: await resizeBase64Image(input.logo),
      teamId: createdTeam.id,
    });
    await prisma.team.update({
      where: {
        id: createdTeam.id,
      },
      data: {
        logoUrl,
      },
    });
  }

  return {
    team: createdTeam,
  };
};

async function isSlugTakenBySomeUserInTheOrganization({
  organizationId,
  slug,
}: {
  organizationId: number;
  slug: string;
}) {
  return await ProfileRepository.findByOrgIdAndUsername({
    organizationId: organizationId,
    username: slug,
  });
}

export default createHandler;
