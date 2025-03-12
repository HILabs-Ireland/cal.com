import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async findById(organizationId: number) {
    return this.dbRead.prisma.team.findUnique({
      where: {
        id: organizationId,
        isOrganization: true,
      },
    });
  }

  async findTeamIdFromClientId(clientId: string) {
    return this.dbRead.prisma.team.findFirstOrThrow({
      where: {
        platformOAuthClient: {
          some: {
            id: clientId,
          },
        },
      },
      select: {
        id: true,
      },
    });
  }

  async findPlatformOrgFromUserId(userId: number) {
    return this.dbRead.prisma.team.findFirstOrThrow({
      where: {
        orgProfiles: {
          some: {
            userId: userId,
          },
        },
        isPlatform: true,
        isOrganization: true,
      },
      select: {
        id: true,
        isPlatform: true,
        isOrganization: true,
      },
    });
  }

  async findOrgUser(organizationId: number, userId: number) {
    return this.dbRead.prisma.user.findUnique({
      where: {
        id: userId,
        profiles: {
          some: {
            organizationId,
          },
        },
      },
    });
  }

  async findOrgTeamUser(organizationId: number, teamId: number, userId: number) {
    return this.dbRead.prisma.user.findUnique({
      where: {
        id: userId,
        profiles: {
          some: {
            organizationId,
          },
        },
        teams: {
          some: {
            teamId: teamId,
          },
        },
      },
    });
  }

  async fetchOrgAdminApiStatus(organizationId: number) {
    return this.dbRead.prisma.organizationSettings.findUnique({
      where: {
        organizationId,
      },
      select: {
        isAdminAPIEnabled: true,
      },
    });
  }
}
