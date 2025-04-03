import type { Prisma } from "@prisma/client";
import type { TFunction } from "next-i18next";

import { defaultVideoAppCategories } from "@calcom/app-store/utils";
import { prisma } from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

import { defaultLocations } from "./locations";

export async function getLocationGroupedOptions(
  userOrTeamId: { userId: number } | { teamId: number },
  t: TFunction
) {
  const apps: Record<
    string,
    {
      label: string;
      value: string;
      disabled?: boolean;
      icon?: string;
      slug?: string;
      credentialId?: number;
    }[]
  > = {};

  // don't default to {}, when you do TS no longer determines the right types.
  let idToSearchObject: Prisma.CredentialWhereInput;

  if ("teamId" in userOrTeamId) {
    const teamId = userOrTeamId.teamId;
    // See if the team event belongs to an org
    const org = await prisma.team.findFirst({
      where: {
        children: {
          some: {
            id: teamId,
          },
        },
      },
    });

    if (org) {
      idToSearchObject = {
        teamId: {
          in: [teamId, org.id],
        },
      };
    } else {
      idToSearchObject = { teamId };
    }
  } else {
    idToSearchObject = { userId: userOrTeamId.userId };
  }

  const credentials = await prisma.credential.findMany({
    where: {
      ...idToSearchObject,
      app: {
        categories: {
          hasSome: defaultVideoAppCategories,
        },
      },
    },
    select: {
      ...credentialForCalendarServiceSelect,
      team: {
        select: {
          name: true,
        },
      },
    },
  });

  defaultLocations.forEach((l) => {
    const category = l.category;
    if (apps[category]) {
      apps[category] = [
        ...apps[category],
        {
          label: l.label,
          value: l.type,
          icon: l.iconUrl,
        },
      ];
    } else {
      apps[category] = [
        {
          label: l.label,
          value: l.type,
          icon: l.iconUrl,
        },
      ];
    }
  });
  const locations = [];

  // Translating labels and pushing into array
  for (const category in apps) {
    const tmp = {
      label: t(category),
      options: apps[category].map((l) => ({
        ...l,
        label: t(l.label),
      })),
    };

    locations.push(tmp);
  }

  return locations;
}
