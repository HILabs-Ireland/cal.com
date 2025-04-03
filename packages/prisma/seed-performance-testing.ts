/**
 *  This script can be used to seed the database with a lot of data for performance testing.
 *  TODO: Make it more structured and configurable from CLI
 *  Run it as `npx ts-node --transpile-only ./seed-performance-testing.ts`
 */
import { createUserAndEventType } from "./seed-utils";

async function createAUserWithManyBookings() {
  const random = Math.random();
  await createUserAndEventType({
    user: {
      email: `pro-${random}@example.com`,
      name: "Pro Example",
      password: "1111",
      username: `pro-${random}`,
      theme: "light",
    },
    eventTypes: [
      {
        title: "30min",
        slug: "30min",
        length: 30,
        _numBookings: 100,
      },
      {
        title: "60min",
        slug: "60min",
        length: 60,
        _numBookings: 100,
      },
      {
        title: "Multiple duration",
        slug: "multiple-duration",
        length: 75,
        metadata: {
          multipleDuration: [30, 75, 90],
        },
        _numBookings: 100,
      },
      {
        title: "Yoga class",
        slug: "yoga-class",
        length: 30,
        _numBookings: 100,
      },
      {
        title: "Tennis class",
        slug: "tennis-class",
        length: 60,
        recurringEvent: { freq: 2, count: 10, interval: 2 },
        requiresConfirmation: true,
        _numBookings: 100,
      },
    ],
  });
}

// createManyDifferentUsersWithDifferentEventTypesAndBookings({
//   tillUser: 20000,
//   startFrom: 10000,
// });

createAUserWithManyBookings();
