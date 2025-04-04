import { getOrgUsernameFromEmail } from "@calcom/features/auth/signup/utils/getOrgUsernameFromEmail";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { createAProfileForAnExistingUser } from "../../createAProfileForAnExistingUser";
import { getParsedTeam } from "./teamUtils";
import { UserRepository } from "./user";

const orgSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
};

export class OrganizationRepository {
  static async createWithExistingUserAsOwner({
    orgData,
    owner,
  }: {
    orgData: {
      name: string;
      slug: string;
      isOrganizationConfigured: boolean;
      isOrganizationAdminReviewed: boolean;
      autoAcceptEmail: string;
      seats: number | null;
      isPlatform: boolean;
    };
    owner: {
      id: number;
      email: string;
      nonOrgUsername: string;
    };
  }) {
    logger.debug("createWithExistingUserAsOwner", safeStringify({ orgData, owner }));
    const organization = await this.create(orgData);
    const ownerProfile = await createAProfileForAnExistingUser({
      user: {
        id: owner.id,
        email: owner.email,
        currentUsername: owner.nonOrgUsername,
      },
      organizationId: organization.id,
    });

    await prisma.membership.create({
      data: {
        userId: owner.id,
        role: MembershipRole.OWNER,
        accepted: true,
        teamId: organization.id,
      },
    });
    return { organization, ownerProfile };
  }

  static async createWithNonExistentOwner({
    orgData,
    owner,
  }: {
    orgData: {
      name: string;
      slug: string;
      isOrganizationConfigured: boolean;
      isOrganizationAdminReviewed: boolean;
      autoAcceptEmail: string;
      seats: number | null;
      isPlatform: boolean;
    };
    owner: {
      email: string;
    };
  }) {
    logger.debug("createWithNonExistentOwner", safeStringify({ orgData, owner }));
    const organization = await this.create(orgData);
    const ownerUsernameInOrg = getOrgUsernameFromEmail(owner.email, orgData.autoAcceptEmail);
    const ownerInDb = await UserRepository.create({
      email: owner.email,
      username: ownerUsernameInOrg,
      organizationId: organization.id,
    });

    await prisma.membership.create({
      data: {
        userId: ownerInDb.id,
        role: MembershipRole.OWNER,
        accepted: true,
        teamId: organization.id,
      },
    });

    return {
      orgOwner: ownerInDb,
      organization,
      ownerProfile: {
        username: ownerUsernameInOrg,
      },
    };
  }

  static async create(orgData: {
    name: string;
    slug: string;
    isOrganizationConfigured: boolean;
    isOrganizationAdminReviewed: boolean;
    autoAcceptEmail: string;
    seats: number | null;
    isPlatform: boolean;
  }) {
    return await prisma.team.create({
      data: {
        name: orgData.name,
        isOrganization: true,
        slug: orgData.slug,
        organizationSettings: {
          create: {
            isAdminReviewed: orgData.isOrganizationAdminReviewed,
            isOrganizationVerified: true,
            isOrganizationConfigured: orgData.isOrganizationConfigured,
            orgAutoAcceptEmail: orgData.autoAcceptEmail,
          },
        },
        metadata: {
          requestedSlug: orgData.slug,
          orgSeats: orgData.seats,
          isPlatform: orgData.isPlatform,
        },
        isPlatform: orgData.isPlatform,
      },
    });
  }

  static async findById({ id }: { id: number }) {
    return prisma.team.findUnique({
      where: {
        id,
        isOrganization: true,
      },
      select: orgSelect,
    });
  }

  static async findByIdIncludeOrganizationSettings({ id }: { id: number }) {
    return prisma.team.findUnique({
      where: {
        id,
        isOrganization: true,
      },
      select: {
        ...orgSelect,
        organizationSettings: true,
      },
    });
  }

  static async findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail({ email }: { email: string }) {
    const emailDomain = email.split("@").at(-1);
    const orgs = await prisma.team.findMany({
      where: {
        isOrganization: true,
        isPlatform: false,
        organizationSettings: {
          orgAutoAcceptEmail: emailDomain,
          isOrganizationVerified: true,
          isAdminReviewed: true,
        },
      },
    });
    if (orgs.length > 1) {
      logger.error(
        "Multiple organizations found with the same auto accept email domain",
        safeStringify({ orgs, emailDomain })
      );
      // Detect and fail just in case this situation arises. We should really identify the problem in this case and fix the data.
      throw new Error("Multiple organizations found with the same auto accept email domain");
    }
    const org = orgs[0];
    if (!org) {
      return null;
    }
    return getParsedTeam(org);
  }

  static async findCurrentOrg({ userId, orgId }: { userId: number; orgId: number }) {
    const membership = await prisma.membership.findFirst({
      where: {
        userId,
        team: {
          id: orgId,
        },
      },
      include: {
        team: true,
      },
    });

    const organizationSettings = await prisma.organizationSettings.findUnique({
      where: {
        organizationId: orgId,
      },
      select: {
        lockEventTypeCreationForUsers: true,
        adminGetsNoSlotsNotification: true,
        isAdminReviewed: true,
        allowSEOIndexing: true,
        orgProfileRedirectsToVerifiedDomain: true,
        orgAutoAcceptEmail: true,
      },
    });

    if (!membership) {
      throw new Error("You do not have a membership to your organization");
    }

    const metadata = teamMetadataSchema.parse(membership?.team.metadata);

    return {
      organizationSettings: {
        lockEventTypeCreationForUsers: organizationSettings?.lockEventTypeCreationForUsers,
        adminGetsNoSlotsNotification: organizationSettings?.adminGetsNoSlotsNotification,
        allowSEOIndexing: organizationSettings?.allowSEOIndexing,
        orgProfileRedirectsToVerifiedDomain: organizationSettings?.orgProfileRedirectsToVerifiedDomain,
        orgAutoAcceptEmail: organizationSettings?.orgAutoAcceptEmail,
      },
      user: {
        role: membership?.role,
        accepted: membership?.accepted,
      },
      ...membership?.team,
      metadata,
    };
  }

  static async findTeamsInOrgIamNotPartOf({ userId, parentId }: { userId: number; parentId: number | null }) {
    const teamsInOrgIamNotPartOf = await prisma.team.findMany({
      where: {
        parentId,
        members: {
          none: {
            userId,
          },
        },
      },
    });

    return teamsInOrgIamNotPartOf;
  }

  static async adminFindById({ id }: { id: number }) {
    const org = await prisma.team.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        metadata: true,
        isOrganization: true,
        members: {
          where: {
            role: "OWNER",
          },
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        organizationSettings: {
          select: {
            isOrganizationConfigured: true,
            isOrganizationVerified: true,
            orgAutoAcceptEmail: true,
          },
        },
      },
    });
    if (!org) {
      throw new Error("Organization not found");
    }

    const parsedMetadata = teamMetadataSchema.parse(org.metadata);
    if (!org?.isOrganization) {
      throw new Error("Organization not found");
    }
    return { ...org, metadata: parsedMetadata };
  }

  static async findByMemberEmail({ email }: { email: string }) {
    const organization = await prisma.team.findFirst({
      where: {
        isOrganization: true,
        members: {
          some: {
            user: { email },
          },
        },
      },
    });
    return organization ?? null;
  }

  static async findByMemberEmailId({ email }: { email: string }) {
    const log = logger.getSubLogger({ prefix: ["findByMemberEmailId"] });
    log.debug("called with", { email });
    const organization = await prisma.team.findFirst({
      where: {
        isOrganization: true,
        members: {
          some: {
            user: {
              email,
            },
          },
        },
      },
    });

    return organization;
  }

  static async findCalVideoLogoByOrgId({ id }: { id: number }) {
    const org = await prisma.team.findUnique({
      where: {
        id,
      },
      select: {
        calVideoLogo: true,
      },
    });

    return org?.calVideoLogo;
  }
}
