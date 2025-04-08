import { describe, it, expect } from "vitest";

import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { getEventTypesFromGroup } from "./getEventTypesFromGroup.handler";

describe("getEventTypesFromGroup", async () => {
  const proUser = await prisma.user.findFirstOrThrow({ where: { email: "pro@example.com" } });
  const proUserEventTypes = await prisma.eventType.findMany({ where: { userId: proUser.id } });

  const teamProUser = await prisma.user.findFirstOrThrow({ where: { email: "teampro@example.com" } });
  const teamProMembership = await prisma.membership.findFirstOrThrow({
    where: { userId: teamProUser.id, accepted: true },
  });

  const teamId = teamProMembership.teamId;

  const proUserCtx = {
    user: {
      id: proUser.id,
      name: proUser.name,
      profile: {
        name: proUser.name,
        organizationId: null,
        organization: null,
        username: proUser.username,
        id: null,
        upId: "usr-4",
      },
    } as NonNullable<TrpcSessionUser>,
    prisma,
  };

  const teamProUserCtx = {
    user: {
      id: teamProUser.id,
      name: teamProUser.name,
      profile: {
        name: teamProUser.name,
        organizationId: null,
        organization: null,
        username: teamProUser.username,
        id: null,
        upId: "usr-9",
      },
    } as NonNullable<TrpcSessionUser>,
    prisma,
  };

  it("should return personal event types for a user", async () => {
    const ctx = proUserCtx;

    const res = await getEventTypesFromGroup({
      ctx,
      input: {
        group: {
          teamId: null,
          parentId: null,
        },
        limit: 10,
        cursor: null,
      },
    });

    const resEventTypeIds = res.eventTypes.map((et) => et.id);
    const proUserEventTypeIds = proUserEventTypes.map((et) => et.id);

    expect(res.eventTypes).toBeDefined();
    expect(res.eventTypes.length).toBeGreaterThan(0);
    expect(resEventTypeIds).toEqual(expect.arrayContaining(proUserEventTypeIds));
    expect(resEventTypeIds.length).toBe(proUserEventTypeIds.length);
  });

  it("should return team event types for a user", async () => {
    const response = await getEventTypesFromGroup({
      ctx: teamProUserCtx,
      input: {
        group: {
          teamId,
          parentId: null,
        },
        limit: 10,
        cursor: null,
      },
    });

    const resEventTypeIds = response.eventTypes.map((et) => et.id);

    const seededTeamEventTypes = await prisma.eventType.findMany({ where: { teamId } });
    const teamProUserEventTypeIds = seededTeamEventTypes.map((et) => et.id);

    expect(response.eventTypes).toBeDefined();
    expect(response.eventTypes.length).toBeGreaterThan(0);
    expect(resEventTypeIds).toEqual(expect.arrayContaining(teamProUserEventTypeIds));
    expect(resEventTypeIds.length).toBe(teamProUserEventTypeIds.length);
  });
});

const deleteEventTypes = async ({ ids }: { ids: number[] }) => {
  await prisma.eventType.deleteMany({ where: { id: { in: ids } } });
};
