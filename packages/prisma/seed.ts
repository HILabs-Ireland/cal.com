import type { Membership, Team, User } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { UserPermissionRole } from "@prisma/client";
import { uuid } from "short-uuid";
import type z from "zod";

import dayjs from "@calcom/dayjs";
import { hashAPIKey } from "@calcom/features/api-keys/lib/apiKeys";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { BookingStatus, MembershipRole, RedirectType, SchedulingType } from "@calcom/prisma/enums";
import type { Ensure } from "@calcom/types/utils";

import prisma from ".";
import mainHugeEventTypesSeed from "./seed-huge-event-types";
import { createUserAndEventType } from "./seed-utils";
import type { teamMetadataSchema } from "./zod-utils";

type PlatformUser = {
  email: string;
  password: string;
  username: string;
  name: string;
  completedOnboarding?: boolean;
  timeZone?: string;
  role?: UserPermissionRole;
  theme?: "dark" | "light";
  avatarUrl?: string | null;
};

type AssociateUserAndOrgProps = {
  teamId: number;
  userId: number;
  role: MembershipRole;
  username: string;
};

const checkUnpublishedTeam = async (slug: string) => {
  return await prisma.team.findFirst({
    where: {
      metadata: {
        path: ["requestedSlug"],
        equals: slug,
      },
    },
  });
};

const setupPlatformUser = async (user: PlatformUser) => {
  const { password: _password, ...restOfUser } = user;
  const userData = {
    ...restOfUser,
    emailVerified: new Date(),
    completedOnboarding: user.completedOnboarding ?? true,
    locale: "en",
    schedules:
      user.completedOnboarding ?? true
        ? {
            create: {
              name: "Working Hours",
              availability: {
                createMany: {
                  data: getAvailabilityFromSchedule(DEFAULT_SCHEDULE),
                },
              },
            },
          }
        : undefined,
  };

  const platformUser = await prisma.user.upsert({
    where: { email_username: { email: user.email, username: user.username } },
    update: userData,
    create: userData,
  });

  await prisma.userPassword.upsert({
    where: { userId: platformUser.id },
    update: {
      hash: await hashPassword(user.password),
    },
    create: {
      hash: await hashPassword(user.password),
      user: {
        connect: {
          id: platformUser.id,
        },
      },
    },
  });

  return platformUser;
};

const createTeam = async (team: Prisma.TeamCreateInput) => {
  try {
    const requestedSlug = (team.metadata as z.infer<typeof teamMetadataSchema>)?.requestedSlug;
    if (requestedSlug) {
      const unpublishedTeam = await checkUnpublishedTeam(requestedSlug);
      if (unpublishedTeam) {
        throw Error("Unique constraint failed on the fields");
      }
    }
    return await prisma.team.create({
      data: {
        ...team,
      },
    });
  } catch (_err) {
    if (_err instanceof Error && _err.message.indexOf("Unique constraint failed on the fields") !== -1) {
      console.log(`Team '${team.name}' already exists, skipping.`);
      return;
    }
    throw _err;
  }
};

const associateUserAndOrg = async ({ teamId, userId, role, username }: AssociateUserAndOrgProps) => {
  await prisma.membership.create({
    data: {
      teamId,
      userId,
      role: role as MembershipRole,
      accepted: true,
    },
  });

  const profile = await prisma.profile.create({
    data: {
      uid: uuid(),
      username,
      organizationId: teamId,
      userId,
    },
  });

  await prisma.user.update({
    data: {
      movedToProfileId: profile.id,
    },
    where: {
      id: userId,
    },
  });
};

async function createPlatformAndSetupUser({
  teamInput,
  user,
}: {
  teamInput: Prisma.TeamCreateInput;
  user: PlatformUser;
}) {
  const team = await createTeam(teamInput);

  const platformUser = await setupPlatformUser(user);

  const { role = MembershipRole.OWNER, username } = platformUser;

  if (!!team) {
    await associateUserAndOrg({
      teamId: team.id,
      userId: platformUser.id,
      role: role as MembershipRole,
      username: user.username,
    });

    console.log(`\t👤 Added '${teamInput.name}' membership for '${username}' with role '${role}'`);
  }
}

async function createTeamAndAddUsers(
  teamInput: Prisma.TeamCreateInput,
  users: { id: number; username: string; role?: MembershipRole }[] = []
) {
  const checkUnpublishedTeam = async (slug: string) => {
    return await prisma.team.findFirst({
      where: {
        metadata: {
          path: ["requestedSlug"],
          equals: slug,
        },
      },
    });
  };
  const createTeam = async (team: Prisma.TeamCreateInput) => {
    try {
      const requestedSlug = (team.metadata as z.infer<typeof teamMetadataSchema>)?.requestedSlug;
      if (requestedSlug) {
        const unpublishedTeam = await checkUnpublishedTeam(requestedSlug);
        if (unpublishedTeam) {
          throw Error("Unique constraint failed on the fields");
        }
      }
      return await prisma.team.create({
        data: {
          ...team,
        },
      });
    } catch (_err) {
      if (_err instanceof Error && _err.message.indexOf("Unique constraint failed on the fields") !== -1) {
        console.log(`Team '${team.name}' already exists, skipping.`);
        return;
      }
      throw _err;
    }
  };

  const team = await createTeam(teamInput);
  if (!team) {
    return;
  }

  for (const user of users) {
    const { role = MembershipRole.OWNER, id, username } = user;
    await prisma.membership.create({
      data: {
        teamId: team.id,
        userId: id,
        role: role,
        accepted: true,
      },
    });
    console.log(`\t👤 Added '${teamInput.name}' membership for '${username}' with role '${role}'`);
  }

  return team;
}

const generatePassword = (existingPassword: string | undefined): string => {
  if (existingPassword) return existingPassword; // Use existing hash if available
  const length = 16;
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  return password;
};

async function createOrganizationAndAddMembersAndTeams({
  org: { orgData, members: orgMembers },
  teams,
  usersOutsideOrg,
}: {
  org: {
    orgData: Ensure<Partial<Prisma.TeamCreateInput>, "name" | "slug"> & {
      organizationSettings: Prisma.OrganizationSettingsCreateWithoutOrganizationInput;
    };
    members: {
      memberData: Ensure<Partial<Prisma.UserCreateInput>, "username" | "name" | "email" | "password">;
      orgMembership: Partial<Membership>;
      orgProfile: {
        username: string;
      };
      inTeams: { slug: string; role: MembershipRole }[];
    }[];
  };
  teams: {
    teamData: Omit<Ensure<Partial<Prisma.TeamCreateInput>, "name" | "slug">, "members">;
    nonOrgMembers: Ensure<Partial<Prisma.UserCreateInput>, "username" | "name" | "email" | "password">[];
  }[];
  usersOutsideOrg: {
    name: string;
    username: string;
    email: string;
  }[];
}) {
  console.log(`\n🏢 Creating organization "${orgData.name}"`);
  const orgMembersInDb: (User & {
    inTeams: { slug: string; role: MembershipRole }[];
    orgMembership: Partial<Membership>;
    orgProfile: {
      username: string;
    };
  })[] = [];

  try {
    const batchSize = 50;
    // Process members in batches of  in parallel
    for (let i = 0; i < orgMembers.length; i += batchSize) {
      const batch = orgMembers.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (member) => {
          const theme =
            member.memberData.theme === "dark" || member.memberData.theme === "light"
              ? member.memberData.theme
              : undefined;

          const newUser = await createUserAndEventType({
            user: {
              ...member.memberData,
              theme: theme,
              password: generatePassword(member.memberData.password.create?.hash),
            },
            eventTypes: [
              {
                title: "30min",
                slug: "30min",
                length: 30,
                _bookings: [
                  {
                    uid: uuid(),
                    title: "30min",
                    startTime: dayjs().add(1, "day").toDate(),
                    endTime: dayjs().add(1, "day").add(30, "minutes").toDate(),
                  },
                ],
              },
            ],
          });

          const orgMemberInDb = {
            ...newUser,
            inTeams: member.inTeams,
            orgMembership: member.orgMembership,
            orgProfile: member.orgProfile,
          };

          await prisma.tempOrgRedirect.create({
            data: {
              fromOrgId: 0,
              type: RedirectType.User,
              from: member.memberData.username,
              toUrl: `${WEBSITE_URL}/${member.orgProfile.username}`,
            },
          });

          return orgMemberInDb;
        })
      );

      orgMembersInDb.push(...batchResults);
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        console.log(`One of the organization members already exists, skipping the entire seeding`);
        return;
      }
    }
    console.error(e);
  }

  await Promise.all([
    usersOutsideOrg.map(async (user) => {
      return await prisma.user.create({
        data: {
          username: user.username,
          name: user.name,
          email: user.email,
          emailVerified: new Date(),
          password: {
            create: {
              hash: await hashPassword(user.username),
            },
          },
        },
      });
    }),
  ]);

  const { organizationSettings, ...restOrgData } = orgData;

  // Create organization with those users as members
  const orgInDb = await prisma.team.create({
    data: {
      ...restOrgData,
      metadata: {
        ...(orgData.metadata && typeof orgData.metadata === "object" ? orgData.metadata : {}),
        isOrganization: true,
      },
      orgProfiles: {
        create: orgMembersInDb.map((member) => ({
          uid: uuid(),
          username: member.orgProfile.username,
          movedFromUser: {
            connect: {
              id: member.id,
            },
          },
          user: {
            connect: {
              id: member.id,
            },
          },
        })),
      },
      organizationSettings: {
        create: {
          ...organizationSettings,
        },
      },
      members: {
        create: orgMembersInDb.map((member) => ({
          user: {
            connect: {
              id: member.id,
            },
          },
          role: member.orgMembership.role || "MEMBER",
          accepted: member.orgMembership.accepted,
        })),
      },
    },
    select: {
      id: true,
      members: true,
      orgProfiles: true,
    },
  });

  const orgMembersInDBWithProfileId = await Promise.all(
    orgMembersInDb.map(async (member) => ({
      ...member,
      profile: {
        ...member.orgProfile,
        id: orgInDb.orgProfiles.find((p) => p.userId === member.id)?.id,
      },
    }))
  );

  // For each member create one event
  for (const member of orgMembersInDBWithProfileId) {
    await prisma.eventType.create({
      data: {
        title: `${member.name} Event`,
        slug: `${member.username}-event`,
        length: 15,
        owner: {
          connect: {
            id: member.id,
          },
        },
        profile: {
          connect: {
            id: member.profile.id,
          },
        },
        users: {
          connect: {
            id: member.id,
          },
        },
      },
    });

    // Create schedule for every member
    await prisma.schedule.create({
      data: {
        name: "Working Hours",
        userId: member.id,
        availability: {
          create: {
            days: [1, 2, 3, 4, 5],
            startTime: "1970-01-01T09:00:00.000Z",
            endTime: "1970-01-01T17:00:00.000Z",
          },
        },
      },
    });
  }

  const organizationTeams: Team[] = [];

  // Create all the teams in the organization
  for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
    const nonOrgMembers: User[] = [];
    const team = teams[teamIndex];
    for (const nonOrgMember of team.nonOrgMembers) {
      nonOrgMembers.push(
        await prisma.user.create({
          data: {
            ...nonOrgMember,
            password: {
              create: {
                hash: await hashPassword(nonOrgMember.username),
              },
            },
            emailVerified: new Date(),
          },
        })
      );
    }
    organizationTeams.push(
      await prisma.team.create({
        data: {
          ...team.teamData,
          parent: {
            connect: {
              id: orgInDb.id,
            },
          },
          metadata: team.teamData.metadata || {},
          members: {
            create: nonOrgMembers.map((member) => ({
              user: {
                connect: {
                  id: member.id,
                },
              },
              role: "MEMBER",
              accepted: true,
            })),
          },
        },
      })
    );

    const ownerForEvent = orgMembersInDBWithProfileId[0];
    // Create event for each team
    await prisma.eventType.create({
      data: {
        title: `${team.teamData.name} Event 1`,
        slug: `${team.teamData.slug}-event-1`,
        schedulingType: SchedulingType.ROUND_ROBIN,
        length: 15,
        team: {
          connect: {
            id: organizationTeams[teamIndex].id,
          },
        },
        owner: {
          connect: {
            id: ownerForEvent.id,
          },
        },
        profile: {
          connect: {
            id: ownerForEvent.profile.id,
          },
        },
        users: {
          connect: {
            id: ownerForEvent.id,
          },
        },
      },
    });
  }

  // Create memberships for all the organization members with the respective teams
  for (const member of orgMembersInDBWithProfileId) {
    for (const { slug: teamSlug, role: role } of member.inTeams) {
      const team = organizationTeams.find((t) => t.slug === teamSlug);
      if (!team) {
        throw Error(`Team with slug ${teamSlug} not found`);
      }
      await prisma.membership.create({
        data: {
          teamId: team.id,
          userId: member.id,
          role: role,
          accepted: true,
        },
      });
    }
  }
}

async function main() {
  await createUserAndEventType({
    user: {
      email: "delete-me@example.com",
      password: "delete-me",
      username: "delete-me",
      name: "delete-me",
    },
  });

  await createUserAndEventType({
    user: {
      email: "onboarding@example.com",
      password: "onboarding",
      username: "onboarding",
      name: "onboarding",
      completedOnboarding: false,
    },
  });

  await createUserAndEventType({
    user: {
      email: "free-first-hidden@example.com",
      password: "free-first-hidden",
      username: "free-first-hidden",
      name: "Free First Hidden Example",
    },
    eventTypes: [
      {
        title: "30min",
        slug: "30min",
        length: 30,
        hidden: true,
      },
      {
        title: "60min",
        slug: "60min",
        length: 30,
      },
    ],
  });

  await createUserAndEventType({
    user: {
      email: "pro@example.com",
      name: "Pro Example",
      password: "pro",
      username: "pro",
      theme: "light",
    },
    eventTypes: [
      {
        title: "30min",
        slug: "30min",
        length: 30,
        _bookings: [
          {
            uid: uuid(),
            title: "30min",
            startTime: dayjs().add(1, "day").toDate(),
            endTime: dayjs().add(1, "day").add(30, "minutes").toDate(),
          },
          {
            uid: uuid(),
            title: "30min",
            startTime: dayjs().add(2, "day").toDate(),
            endTime: dayjs().add(2, "day").add(30, "minutes").toDate(),
            status: BookingStatus.PENDING,
          },
          {
            // hardcode UID so that we can easily test rescheduling in embed
            uid: "qm3kwt3aTnVD7vmP9tiT2f",
            title: "30min Seeded Booking",
            startTime: dayjs().add(3, "day").toDate(),
            endTime: dayjs().add(3, "day").add(30, "minutes").toDate(),
            status: BookingStatus.PENDING,
          },
        ],
      },
      {
        title: "60min",
        slug: "60min",
        length: 60,
      },
      {
        title: "Multiple duration",
        slug: "multiple-duration",
        length: 75,
        metadata: {
          multipleDuration: [30, 75, 90],
        },
      },
      {
        title: "In person meeting",
        slug: "in-person",
        length: 60,
        locations: [{ type: "inPerson", address: "London" }],
      },
      {
        title: "Yoga class",
        slug: "yoga-class",
        length: 30,
        recurringEvent: { freq: 2, count: 12, interval: 1 },
        _bookings: [
          {
            uid: uuid(),
            title: "Yoga class",
            recurringEventId: Buffer.from("yoga-class").toString("base64"),
            startTime: dayjs().add(1, "day").toDate(),
            endTime: dayjs().add(1, "day").add(30, "minutes").toDate(),
            status: BookingStatus.ACCEPTED,
          },
          {
            uid: uuid(),
            title: "Yoga class",
            recurringEventId: Buffer.from("yoga-class").toString("base64"),
            startTime: dayjs().add(1, "day").add(1, "week").toDate(),
            endTime: dayjs().add(1, "day").add(1, "week").add(30, "minutes").toDate(),
            status: BookingStatus.ACCEPTED,
          },
          {
            uid: uuid(),
            title: "Yoga class",
            recurringEventId: Buffer.from("yoga-class").toString("base64"),
            startTime: dayjs().add(1, "day").add(2, "week").toDate(),
            endTime: dayjs().add(1, "day").add(2, "week").add(30, "minutes").toDate(),
            status: BookingStatus.ACCEPTED,
          },
          {
            uid: uuid(),
            title: "Yoga class",
            recurringEventId: Buffer.from("yoga-class").toString("base64"),
            startTime: dayjs().add(1, "day").add(3, "week").toDate(),
            endTime: dayjs().add(1, "day").add(3, "week").add(30, "minutes").toDate(),
            status: BookingStatus.ACCEPTED,
          },
          {
            uid: uuid(),
            title: "Yoga class",
            recurringEventId: Buffer.from("yoga-class").toString("base64"),
            startTime: dayjs().add(1, "day").add(4, "week").toDate(),
            endTime: dayjs().add(1, "day").add(4, "week").add(30, "minutes").toDate(),
            status: BookingStatus.ACCEPTED,
          },
          {
            uid: uuid(),
            title: "Yoga class",
            recurringEventId: Buffer.from("yoga-class").toString("base64"),
            startTime: dayjs().add(1, "day").add(5, "week").toDate(),
            endTime: dayjs().add(1, "day").add(5, "week").add(30, "minutes").toDate(),
            status: BookingStatus.ACCEPTED,
          },
          {
            uid: uuid(),
            title: "Seeded Yoga class",
            description: "seeded",
            recurringEventId: Buffer.from("seeded-yoga-class").toString("base64"),
            startTime: dayjs().subtract(4, "day").toDate(),
            endTime: dayjs().subtract(4, "day").add(30, "minutes").toDate(),
            status: BookingStatus.ACCEPTED,
          },
          {
            uid: uuid(),
            title: "Seeded Yoga class",
            description: "seeded",
            recurringEventId: Buffer.from("seeded-yoga-class").toString("base64"),
            startTime: dayjs().subtract(4, "day").add(1, "week").toDate(),
            endTime: dayjs().subtract(4, "day").add(1, "week").add(30, "minutes").toDate(),
            status: BookingStatus.ACCEPTED,
          },
          {
            uid: uuid(),
            title: "Seeded Yoga class",
            description: "seeded",
            recurringEventId: Buffer.from("seeded-yoga-class").toString("base64"),
            startTime: dayjs().subtract(4, "day").add(2, "week").toDate(),
            endTime: dayjs().subtract(4, "day").add(2, "week").add(30, "minutes").toDate(),
            status: BookingStatus.ACCEPTED,
          },
          {
            uid: uuid(),
            title: "Seeded Yoga class",
            description: "seeded",
            recurringEventId: Buffer.from("seeded-yoga-class").toString("base64"),
            startTime: dayjs().subtract(4, "day").add(3, "week").toDate(),
            endTime: dayjs().subtract(4, "day").add(3, "week").add(30, "minutes").toDate(),
            status: BookingStatus.ACCEPTED,
          },
        ],
      },
      {
        title: "Tennis class",
        slug: "tennis-class",
        length: 60,
        recurringEvent: { freq: 2, count: 10, interval: 2 },
        requiresConfirmation: true,
        _bookings: [
          {
            uid: uuid(),
            title: "Tennis class",
            recurringEventId: Buffer.from("tennis-class").toString("base64"),
            startTime: dayjs().add(2, "day").toDate(),
            endTime: dayjs().add(2, "day").add(60, "minutes").toDate(),
            status: BookingStatus.PENDING,
          },
          {
            uid: uuid(),
            title: "Tennis class",
            recurringEventId: Buffer.from("tennis-class").toString("base64"),
            startTime: dayjs().add(2, "day").add(2, "week").toDate(),
            endTime: dayjs().add(2, "day").add(2, "week").add(60, "minutes").toDate(),
            status: BookingStatus.PENDING,
          },
          {
            uid: uuid(),
            title: "Tennis class",
            recurringEventId: Buffer.from("tennis-class").toString("base64"),
            startTime: dayjs().add(2, "day").add(4, "week").toDate(),
            endTime: dayjs().add(2, "day").add(4, "week").add(60, "minutes").toDate(),
            status: BookingStatus.PENDING,
          },
          {
            uid: uuid(),
            title: "Tennis class",
            recurringEventId: Buffer.from("tennis-class").toString("base64"),
            startTime: dayjs().add(2, "day").add(8, "week").toDate(),
            endTime: dayjs().add(2, "day").add(8, "week").add(60, "minutes").toDate(),
            status: BookingStatus.PENDING,
          },
          {
            uid: uuid(),
            title: "Tennis class",
            recurringEventId: Buffer.from("tennis-class").toString("base64"),
            startTime: dayjs().add(2, "day").add(10, "week").toDate(),
            endTime: dayjs().add(2, "day").add(10, "week").add(60, "minutes").toDate(),
            status: BookingStatus.PENDING,
          },
        ],
      },
    ],
  });

  await createUserAndEventType({
    user: {
      email: "free@example.com",
      password: "free",
      username: "free",
      name: "Free Example",
    },
    eventTypes: [
      {
        title: "30min",
        slug: "30min",
        length: 30,
      },
      {
        title: "60min",
        slug: "60min",
        length: 30,
      },
    ],
  });

  await createUserAndEventType({
    user: {
      email: "usa@example.com",
      password: "usa",
      username: "usa",
      name: "USA Timezone Example",
      timeZone: "America/Phoenix",
    },
    eventTypes: [
      {
        title: "30min",
        slug: "30min",
        length: 30,
      },
    ],
  });

  const freeUserTeam = await createUserAndEventType({
    user: {
      email: "teamfree@example.com",
      password: "teamfree",
      username: "teamfree",
      name: "Team Free Example",
    },
  });

  const proUserTeam = await createUserAndEventType({
    user: {
      email: "teampro@example.com",
      password: "teampro",
      username: "teampro",
      name: "Team Pro Example",
    },
  });

  await createUserAndEventType({
    user: {
      email: "admin@example.com",
      /** To comply with admin password requirements  */
      password: "ADMINadmin2022!",
      username: "admin",
      name: "Admin Example",
      role: "ADMIN",
    },
  });

  await createPlatformAndSetupUser({
    teamInput: {
      name: "Platform Team",
      slug: "platform-admin-team",
      isPlatform: true,
      isOrganization: true,
      eventTypes: {
        createMany: {
          data: [
            {
              title: "Collective Seeded Team Event",
              slug: "collective-seeded-team-event",
              length: 15,
              schedulingType: "COLLECTIVE",
            },
            {
              title: "Round Robin Seeded Team Event",
              slug: "round-robin-seeded-team-event",
              length: 15,
              schedulingType: "ROUND_ROBIN",
            },
          ],
        },
      },
      createdAt: new Date(),
    },
    user: {
      email: "platform@example.com",
      /** To comply with admin password requirements  */
      password: "PLATFORMadmin2024!",
      username: "platform",
      name: "Platform Admin",
      role: "ADMIN",
    },
  });

  const pro2UserTeam = await createUserAndEventType({
    user: {
      email: "teampro2@example.com",
      password: "teampro2",
      username: "teampro2",
      name: "Team Pro Example 2",
    },
  });

  const pro3UserTeam = await createUserAndEventType({
    user: {
      email: "teampro3@example.com",
      password: "teampro3",
      username: "teampro3",
      name: "Team Pro Example 3",
    },
  });

  const pro4UserTeam = await createUserAndEventType({
    user: {
      email: "teampro4@example.com",
      password: "teampro4",
      username: "teampro4",
      name: "Team Pro Example 4",
    },
  });

  if (!!(process.env.E2E_TEST_CALCOM_QA_EMAIL && process.env.E2E_TEST_CALCOM_QA_PASSWORD)) {
    await createUserAndEventType({
      user: {
        email: process.env.E2E_TEST_CALCOM_QA_EMAIL || "qa@example.com",
        password: process.env.E2E_TEST_CALCOM_QA_PASSWORD || "qa",
        username: "qa",
        name: "QA Example",
      },
      eventTypes: [
        {
          title: "15min",
          slug: "15min",
          length: 15,
        },
      ],
      credentials: [
        !!process.env.E2E_TEST_CALCOM_QA_GCAL_CREDENTIALS
          ? {
              type: "google_calendar",
              key: JSON.parse(process.env.E2E_TEST_CALCOM_QA_GCAL_CREDENTIALS) as Prisma.JsonObject,
              appId: "google-calendar",
            }
          : null,
      ],
    });
  }

  await createTeamAndAddUsers(
    {
      name: "Seeded Team",
      slug: "seeded-team",
      eventTypes: {
        createMany: {
          data: [
            {
              title: "Collective Seeded Team Event",
              slug: "collective-seeded-team-event",
              length: 15,
              schedulingType: "COLLECTIVE",
            },
            {
              title: "Round Robin Seeded Team Event",
              slug: "round-robin-seeded-team-event",
              length: 15,
              schedulingType: "ROUND_ROBIN",
            },
          ],
        },
      },
      createdAt: new Date(),
    },
    [
      {
        id: proUserTeam.id,
        username: proUserTeam.name || "Unknown",
      },
      {
        id: freeUserTeam.id,
        username: freeUserTeam.name || "Unknown",
      },
      {
        id: pro2UserTeam.id,
        username: pro2UserTeam.name || "Unknown",
        role: "MEMBER",
      },
      {
        id: pro3UserTeam.id,
        username: pro3UserTeam.name || "Unknown",
      },
      {
        id: pro4UserTeam.id,
        username: pro4UserTeam.name || "Unknown",
      },
    ]
  );

  await createOrganizationAndAddMembersAndTeams({
    org: {
      orgData: {
        name: "Acme Inc",
        slug: "acme",
        isOrganization: true,
        organizationSettings: {
          isOrganizationVerified: true,
          orgAutoAcceptEmail: "acme.com",
          isAdminAPIEnabled: true,
        },
      },
      members: [
        {
          memberData: {
            email: "owner1-acme@example.com",
            password: {
              create: {
                hash: "owner1-acme",
              },
            },
            username: "owner1-acme",
            name: "Owner 1",
          },
          orgMembership: {
            role: "OWNER",
            accepted: true,
          },
          orgProfile: {
            username: "owner1",
          },
          inTeams: [
            {
              slug: "team1",
              role: "ADMIN",
            },
          ],
        },
        ...Array.from({ length: 10 }, (_, i) => ({
          memberData: {
            email: `member${i}-acme@example.com`,
            password: {
              create: {
                hash: `member${i}-acme`,
              },
            },
            username: `member${i}-acme`,
            name: `Member ${i}`,
          },
          orgMembership: {
            role: MembershipRole.MEMBER,
            accepted: true,
          },
          orgProfile: {
            username: `member${i}`,
          },
          inTeams:
            i % 2 === 0
              ? [
                  {
                    slug: "team1",
                    role: MembershipRole.MEMBER,
                  },
                ]
              : [],
        })),
      ],
    },
    teams: [
      {
        teamData: {
          name: "Team 1",
          slug: "team1",
        },
        nonOrgMembers: [
          {
            email: "non-acme-member-1@example.com",
            password: {
              create: {
                hash: "non-acme-member-1",
              },
            },
            username: "non-acme-member-1",
            name: "NonAcme Member1",
          },
        ],
      },
    ],
    usersOutsideOrg: [
      {
        name: "Jane Doe",
        email: "jane@acme.com",
        username: "jane-outside-org",
      },
    ],
  });

  await createOrganizationAndAddMembersAndTeams({
    org: {
      orgData: {
        name: "Dunder Mifflin",
        slug: "dunder-mifflin",
        isOrganization: true,
        organizationSettings: {
          isOrganizationVerified: true,
          orgAutoAcceptEmail: "dunder-mifflin.com",
        },
      },
      members: [
        {
          memberData: {
            email: "owner1-dunder@example.com",
            password: {
              create: {
                hash: "owner1-dunder",
              },
            },
            username: "owner1-dunder",
            name: "Owner 1",
          },
          orgMembership: {
            role: "OWNER",
            accepted: true,
          },
          orgProfile: {
            username: "owner1",
          },
          inTeams: [
            {
              slug: "team1",
              role: "ADMIN",
            },
          ],
        },
      ],
    },
    teams: [
      {
        teamData: {
          name: "Team 1",
          slug: "team1",
        },
        nonOrgMembers: [
          {
            email: "non-dunder-member-1@example.com",
            password: {
              create: {
                hash: "non-dunder-member-1",
              },
            },
            username: "non-dunder-member-1",
            name: "NonDunder Member1",
          },
        ],
      },
    ],
    usersOutsideOrg: [
      {
        name: "John Doe",
        email: "john@dunder-mifflin.com",
        username: "john-outside-org",
      },
    ],
  });

  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@example.com" },
  });

  if (!adminUser) {
    throw Error("Admin user not found");
  }

  const adminApiKey = hashAPIKey("test-admin-key");

  await prisma.apiKey.upsert({
    where: {
      hashedKey: adminApiKey, // Check if the hashedKey already exists
    },
    update: {}, // Do nothing if it exists
    create: {
      id: uuid(),
      userId: adminUser.id,
      note: "Admin API Key",
      expiresAt: null,
      hashedKey: adminApiKey,
    },
  });

  const existingMembership = await prisma.membership.findUnique({
    where: {
      userId_teamId: {
        userId: adminUser.id,
        teamId: 1,
      },
    },
  });

  if (!existingMembership) {
    await prisma.membership.createMany({
      data: [
        {
          teamId: 1,
          userId: adminUser.id,
          accepted: true,
          role: "ADMIN",
          disableImpersonation: false,
        },
        {
          teamId: 2,
          userId: adminUser.id,
          accepted: true,
          role: "ADMIN",
          disableImpersonation: false,
        },
      ],
    });
  }

  // Change existing teamId for event types
  await prisma.$executeRaw`
    UPDATE "EventType"
    SET "teamId" = 3
    WHERE "teamId" = 1
    AND EXISTS (SELECT 1 FROM "Team" WHERE id = 3)
  `;

  await prisma.$executeRaw`
    UPDATE "EventType"
    SET "teamId" = 4
    WHERE "teamId" = 2
    AND EXISTS (SELECT 1 FROM "Team" WHERE id = 4)
  `;

  // Team id: 1 = Nurses
  await prisma.team.update({
    where: { id: 1 },
    data: {
      name: "Alternaleaf - Nurses",
      slug: "alternaleaf-nurses",
      timeZone: "Europe/London",
      isPlatform: false,
      isOrganization: false,
    },
  });

  // Nurse webhooks
  await prisma.webhook.upsert({
    where: {
      id: "49bb4152-3e05-452b-b1f3-c133b0432118",
    },
    update: {},
    create: {
      teamId: 1,
      id: "49bb4152-3e05-452b-b1f3-c133b0432118",
      subscriberUrl: "http://localhost:9000/api/v1/calcom/webhooks",
      active: true,
      eventTriggers: ["BOOKING_CANCELLED", "BOOKING_CREATED", "BOOKING_RESCHEDULED"],
      secret: "pms-service-webhook-secret",
      platform: false,
    },
  });

  // Nurse round robin event
  await prisma.eventType.update({
    where: { id: 4 },
    data: {
      teamId: 1,
      title: "Initial Consultation - Staging",
      slug: "initial-consultation",
      description:
        "Book your 20-minute consultation with one of our friendly Alternaleaf nurses, which includes:\n\n✓ Speaking to a qualified clinician with deep medical knowledge across a range of physical and mental health conditions.\n\n✓ Telehealth consultation from the comfort of your home.\n\n✓ Personalised treatment plan based on your condition and medical history.\n\nFollowing your nurse consultation, you'll be invited to book an appointment with one of our qualified doctors.",
      locations: [{ link: "https://alternaleaf.com.au", type: "link" }],
      length: 20,
      hidden: true,
      userId: adminUser.id,
      eventName: "",
      timeZone: null,
      periodCountCalendarDays: false,
      periodDays: 45,
      requiresConfirmation: false,
      minimumBookingNotice: 15,
      schedulingType: "ROUND_ROBIN",
      disableGuests: true,
      position: 0,
      periodType: "ROLLING",
      slotInterval: 20,
      metadata: {
        config: { useHostSchedulesForTeamEvent: true },
        bookerLayouts: { defaultLayout: "month_view", enabledLayouts: ["month_view", "week_view"] },
      },
      afterEventBuffer: 0,
      beforeEventBuffer: 0,
      hideCalendarNotes: false,
      successRedirectUrl: "",
      seatsPerTimeSlot: null,
      recurringEvent: false,
      scheduleId: null,
      bookingLimits: {},
      seatsShowAttendees: false,
      bookingFields: [
        {
          name: "name",
          type: "name",
          label: "",
          sources: [{ id: "default", type: "default", label: "Default" }],
          variant: "firstAndLastName",
          editable: "system",
          required: true,
          placeholder: "",
          defaultLabel: "your_name",
          variantsConfig: {
            variants: {
              fullName: {
                fields: [
                  { name: "fullName", type: "text", label: "Your name", required: true, placeholder: "" },
                ],
              },
              firstAndLastName: {
                fields: [
                  { name: "firstName", type: "text", label: "", required: true, placeholder: "" },
                  { name: "lastName", type: "text", label: "", required: true, placeholder: "" },
                ],
              },
            },
          },
          disableOnPrefill: false,
        },
        {
          name: "email",
          type: "email",
          sources: [{ id: "default", type: "default", label: "Default" }],
          editable: "system",
          required: true,
          defaultLabel: "email_address",
        },
        {
          name: "location",
          type: "radioInput",
          sources: [{ id: "default", type: "default", label: "Default" }],
          editable: "system",
          required: false,
          defaultLabel: "location",
          getOptionsAt: "locations",
          optionsInputs: {
            phone: { type: "phone", required: true, placeholder: "" },
            attendeeInPerson: { type: "address", required: true, placeholder: "" },
          },
          hideWhenJustOneOption: true,
        },
        {
          name: "phoneNumber",
          type: "phone",
          label: "Phone number (in case the clinic needs to reach you)",
          required: true,
          placeholder: "+61",
          disableOnPrefill: false,
        },
        {
          name: "consentToConsultationRecording",
          type: "boolean",
          label:
            "I understand that Alternaleaf may record and/or transcribe the consultations I may have with Alternaleaf health care providers for training and quality purposes. In proceeding with this booking, I am consenting to my consultations being recorded.",
          sources: [{ id: "user", type: "user", label: "User", fieldRequired: true }],
          editable: "user",
          required: true,
          placeholder: "",
          labelAsSafeHtml:
            "<p>I understand that Alternaleaf may record and/or transcribe the consultations I may have with Alternaleaf health care providers for training and quality purposes. In proceeding with this booking,<br />I am consenting to my consultations being recorded.</p>\n",
          disableOnPrefill: false,
        },
        {
          name: "medicareNameCheck",
          type: "boolean",
          label: "My first and last name matches the name on my Medicare card.",
          hidden: false,
          options: [
            { label: "Option 1", value: "Option 1" },
            { label: "Option 2", value: "Option 2" },
          ],
          required: true,
          labelAsSafeHtml: "<p>My first and last name matches the name on my Medicare card.</p>\n",
        },
        {
          name: "appointmentConfirmation",
          type: "boolean",
          label:
            "I confirm I can make my appointment. Nurse appointments are in high demand. Please consider fellow patients and avoid booking slots you can't attend. Charges may apply if appointments are cancelled with less than 24 hours notice.",
          hidden: true,
          options: [
            { label: "Option 1", value: "Option 1" },
            { label: "Option 2", value: "Option 2" },
          ],
          required: true,
          labelAsSafeHtml:
            "<p>I confirm I can make my appointment. Nurse appointments are in high demand. Please consider fellow patients and avoid booking slots you can't attend. Charges may apply if appointments are cancelled with less than 24 hours notice.</p>\n",
        },
        {
          name: "title",
          type: "text",
          hidden: true,
          sources: [{ id: "default", type: "default", label: "Default" }],
          editable: "system-but-optional",
          required: true,
          defaultLabel: "what_is_this_meeting_about",
          defaultPlaceholder: "",
        },
        {
          name: "notes",
          type: "textarea",
          hidden: true,
          sources: [{ id: "default", type: "default", label: "Default" }],
          editable: "system-but-optional",
          required: false,
          defaultLabel: "additional_notes",
          defaultPlaceholder: "share_additional_notes",
        },
        {
          name: "guests",
          type: "multiemail",
          hidden: true,
          sources: [{ id: "default", type: "default", label: "Default" }],
          editable: "system-but-optional",
          required: false,
          defaultLabel: "additional_guests",
          defaultPlaceholder: "email",
        },
        {
          name: "rescheduleReason",
          type: "textarea",
          label: "",
          views: [{ id: "reschedule", label: "Reschedule View" }],
          hidden: false,
          sources: [{ id: "default", type: "default", label: "Default" }],
          editable: "system-but-optional",
          required: false,
          placeholder: "",
          defaultLabel: "reason_for_reschedule",
          defaultPlaceholder: "reschedule_placeholder",
        },
        {
          name: "utmCampaign",
          type: "textarea",
          label: "utmCampaign",
          hidden: true,
          sources: [{ id: "user", type: "user", label: "User", fieldRequired: true }],
          editable: "user",
          required: false,
          placeholder: "",
        },
        {
          name: "utmTerm",
          type: "textarea",
          label: "utmTerm",
          hidden: true,
          sources: [{ id: "user", type: "user", label: "User", fieldRequired: false }],
          editable: "user",
          required: false,
          placeholder: "",
        },
        {
          name: "utmMedium",
          type: "textarea",
          label: "utmMedium",
          hidden: true,
          sources: [{ id: "user", type: "user", label: "User", fieldRequired: false }],
          editable: "user",
          required: false,
          placeholder: "",
        },
        {
          name: "utmSource",
          type: "textarea",
          label: "utmSource",
          hidden: true,
          sources: [{ id: "user", type: "user", label: "User", fieldRequired: false }],
          editable: "user",
          required: false,
          placeholder: "",
        },
        {
          name: "utmContent",
          type: "textarea",
          label: "utmContent",
          hidden: true,
          sources: [{ id: "user", type: "user", label: "User", fieldRequired: false }],
          editable: "user",
          required: false,
          placeholder: "",
        },
        {
          name: "isEwayPayment",
          type: "textarea",
          label: "isEwayPayment",
          hidden: true,
          sources: [{ id: "user", type: "user", label: "User", fieldRequired: true }],
          editable: "user",
          required: true,
          placeholder: "",
        },
        {
          name: "promocode",
          type: "textarea",
          label: "promocode",
          hidden: true,
          sources: [{ id: "user", type: "user", label: "User", fieldRequired: false }],
          editable: "user",
          required: false,
          placeholder: "",
        },
      ],
      durationLimits: {},
      parentId: null,
      offsetStart: 0,
      requiresBookerEmailVerification: false,
      seatsShowAvailabilityCount: true,
      lockTimeZoneToggleOnBookingPage: false,
      onlyShowFirstAvailableSlot: false,
      isInstantEvent: false,
      assignAllTeamMembers: false,
      profileId: null,
      useEventTypeDestinationCalendarEmail: false,
      secondaryEmailId: null,
      forwardParamsSuccessRedirect: true,
      isRRWeightsEnabled: false,
      rescheduleWithSameRoundRobinHost: false,
      requiresConfirmationWillBlockSlot: false,
      hideCalendarEventDetails: false,
      assignRRMembersUsingSegment: false,
      maxLeadThreshold: null,
      requiresConfirmationForFreeEmail: false,
    },
  });

  // Team id: 2 = Doctors
  await prisma.team.update({
    where: { id: 2 },
    data: {
      name: "Alternaleaf - Doctors",
      slug: "alternaleaf-doctors",
      timeZone: "Europe/London",
      isPlatform: false,
      isOrganization: false,
    },
  });

  // Doctor webhooks
  await prisma.webhook.upsert({
    where: {
      id: "3aab44ee-f1f8-4658-ace9-7accb81ea729",
    },
    update: {},
    create: {
      teamId: 2,
      id: "3aab44ee-f1f8-4658-ace9-7accb81ea729",
      subscriberUrl: "http://localhost:9000/api/v1/calcom/webhooks",
      active: true,
      eventTriggers: ["BOOKING_CANCELLED", "BOOKING_CREATED", "BOOKING_RESCHEDULED"],
      secret: "pms-service-webhook-secret",
      platform: false,
    },
  });

  // Doctor round robin event
  await prisma.eventType.update({
    where: {
      id: 5,
    },
    data: {
      teamId: 2,
      title: "Medical Consultation - Staging",
      slug: "medical-cannabis-consultation",
      description:
        "Book your 10-minute consultation with a friendly Alternaleaf doctor, which includes:\n\n✓ Speaking to a qualified doctor with a deep knowledge of plant medicine.\n\n✓ Telehealth consultation from the comfort of your home.\n\n✓ Personalised treatment plan based on your condition and medical history.\n\nFollowing your doctor consultation, you'll receive a script with your medicine to your email address.",
      locations: [{ link: "https://alternaleaf.com.au", type: "link" }],
      length: 10,
      hidden: true,
      userId: adminUser.id,
      eventName: "",
      timeZone: null,
      periodCountCalendarDays: false,
      periodDays: 45,
      requiresConfirmation: false,
      minimumBookingNotice: 15,
      schedulingType: "ROUND_ROBIN",
      disableGuests: true,
      position: 0,
      periodType: "ROLLING",
      slotInterval: 10,
      metadata: {
        config: { useHostSchedulesForTeamEvent: true },
      },
      afterEventBuffer: 0,
      beforeEventBuffer: 0,
      hideCalendarNotes: false,
      successRedirectUrl: "",
      seatsPerTimeSlot: null,
      recurringEvent: false,
      scheduleId: null,
      bookingLimits: {},
      seatsShowAttendees: false,
      bookingFields: [
        {
          name: "name",
          type: "name",
          label: "",
          sources: [{ id: "default", type: "default", label: "Default" }],
          editable: "system",
          required: true,
          placeholder: "",
          defaultLabel: "your_name",
          variantsConfig: {
            variants: {
              fullName: {
                fields: [
                  { name: "fullName", type: "text", label: "Your name", required: true, placeholder: "" },
                ],
              },
              firstAndLastName: {
                fields: [
                  { name: "firstName", type: "text", required: true },
                  { name: "lastName", type: "text", required: false },
                ],
              },
            },
          },
          disableOnPrefill: true,
        },
        {
          name: "email",
          type: "email",
          label: "",
          sources: [{ id: "default", type: "default", label: "Default" }],
          editable: "system",
          required: true,
          placeholder: "",
          defaultLabel: "email_address",
          excludeEmails: "",
          requireEmails: "",
          disableOnPrefill: true,
        },
        {
          name: "location",
          type: "radioInput",
          sources: [{ id: "default", type: "default", label: "Default" }],
          editable: "system",
          required: false,
          defaultLabel: "location",
          getOptionsAt: "locations",
          optionsInputs: {
            phone: { type: "phone", required: true, placeholder: "" },
            attendeeInPerson: { type: "address", required: true, placeholder: "" },
          },
          hideWhenJustOneOption: true,
        },
        {
          name: "phoneNumber",
          type: "phone",
          label: "Phone number (in case the clinic needs to reach you)",
          hidden: false,
          required: true,
          placeholder: "+61",
          disableOnPrefill: true,
        },
        {
          name: "consentToConsultationRecording",
          type: "boolean",
          label:
            "I understand that Alternaleaf may record and/or transcribe the consultations I may have with Alternaleaf health care providers for training and quality purposes. In proceeding with this booking, I am consenting to my consultations being recorded.",
          options: [
            { label: "Option 1", value: "Option 1" },
            { label: "Option 2", value: "Option 2" },
          ],
          sources: [{ id: "user", type: "user", label: "User", fieldRequired: true }],
          editable: "user",
          required: true,
          placeholder: "",
          labelAsSafeHtml:
            "<p>I understand that Alternaleaf may record and/or transcribe the consultations I may have with Alternaleaf health care providers for training and quality purposes. In proceeding with this booking, I am consenting to my consultations being recorded.</p>\n",
          disableOnPrefill: false,
        },
        {
          name: "title",
          type: "text",
          hidden: true,
          sources: [{ id: "default", type: "default", label: "Default" }],
          editable: "system-but-optional",
          required: true,
          defaultLabel: "what_is_this_meeting_about",
          defaultPlaceholder: "",
        },
        {
          name: "notes",
          type: "textarea",
          hidden: true,
          sources: [{ id: "default", type: "default", label: "Default" }],
          editable: "system-but-optional",
          required: false,
          defaultLabel: "additional_notes",
          defaultPlaceholder: "share_additional_notes",
        },
        {
          name: "guests",
          type: "multiemail",
          hidden: true,
          sources: [{ id: "default", type: "default", label: "Default" }],
          editable: "system-but-optional",
          required: false,
          defaultLabel: "additional_guests",
          defaultPlaceholder: "email",
        },
        {
          name: "rescheduleReason",
          type: "textarea",
          views: [{ id: "reschedule", label: "Reschedule View" }],
          hidden: true,
          sources: [{ id: "default", type: "default", label: "Default" }],
          editable: "system-but-optional",
          required: false,
          defaultLabel: "reason_for_reschedule",
          defaultPlaceholder: "reschedule_placeholder",
        },
      ],
      durationLimits: {},
      parentId: null,
      offsetStart: 0,
      requiresBookerEmailVerification: false,
      seatsShowAvailabilityCount: true,
      lockTimeZoneToggleOnBookingPage: false,
      onlyShowFirstAvailableSlot: false,
      isInstantEvent: false,
      assignAllTeamMembers: false,
      profileId: null,
      useEventTypeDestinationCalendarEmail: false,
      secondaryEmailId: null,
      forwardParamsSuccessRedirect: true,
      isRRWeightsEnabled: false,
      rescheduleWithSameRoundRobinHost: false,
      requiresConfirmationWillBlockSlot: false,
      hideCalendarEventDetails: false,
      assignRRMembersUsingSegment: false,
      maxLeadThreshold: null,
      requiresConfirmationForFreeEmail: false,
    },
  });
}

main()
  .then(mainHugeEventTypesSeed)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
