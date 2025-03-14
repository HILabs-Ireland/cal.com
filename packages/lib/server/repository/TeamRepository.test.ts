import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { TRPCError } from "@trpc/server";

import { TeamRepository } from "./team";

vi.mock("@calcom/lib/domainManager/organization", () => ({
  deleteDomain: vi.fn(),
}));

vi.mock("@calcom/features/ee/teams/lib/removeMember", () => ({
  default: vi.fn(),
}));

describe("TeamRepository", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("findById", () => {
    it("should return null if team is not found", async () => {
      prismaMock.team.findUnique.mockResolvedValue(null);
      const result = await TeamRepository.findById({ id: 1 });
      expect(result).toBeNull();
    });

    it("should return parsed team if found", async () => {
      const mockTeam = {
        id: 1,
        name: "Test Team",
        slug: "test-team",
        logoUrl: "test-logo-url",
        parentId: 1,
        metadata: {
          requestedSlug: null,
        },
        isOrganization: true,
        organizationSettings: {},
        isPlatform: true,
        requestedSlug: null,
      };
      prismaMock.team.findUnique.mockResolvedValue(mockTeam);
      const result = await TeamRepository.findById({ id: 1 });
      expect(result).toEqual(mockTeam);
    });
  });

  describe("deleteById", () => {
    it("should delete team and related data", async () => {
      const mockDeletedTeam = { id: 1, name: "Deleted Team", isOrganization: true, slug: "deleted-team" };
      prismaMock.team.delete.mockResolvedValue(mockDeletedTeam);

      // Mock the Prisma transaction
      const mockTransaction = {
        eventType: { deleteMany: vi.fn() },
        membership: { deleteMany: vi.fn() },
        team: { delete: vi.fn().mockResolvedValue(mockDeletedTeam) },
      };

      //   Mock the transaction calls so we can spy on it
      prismaMock.$transaction.mockImplementation((callback) => callback(mockTransaction));

      const result = await TeamRepository.deleteById({ id: 1 });

      expect(mockTransaction.eventType.deleteMany).toHaveBeenCalledWith({
        where: {
          teamId: 1,
          schedulingType: "MANAGED",
        },
      });
      expect(mockTransaction.membership.deleteMany).toHaveBeenCalledWith({
        where: {
          teamId: 1,
        },
      });
      expect(mockTransaction.team.delete).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });

      expect(result).toEqual(mockDeletedTeam);
    });
  });

  describe("inviteMemberByToken", () => {
    it("should throw error if verification token is not found", async () => {
      prismaMock.verificationToken.findFirst.mockResolvedValue(null);
      await expect(TeamRepository.inviteMemberByToken("invalid-token", 1)).rejects.toThrow(TRPCError);
    });
  });
});
