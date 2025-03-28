import type { User } from "@prisma/client";

import prisma from "@calcom/prisma";

export async function deleteUser(user: Pick<User, "id" | "email" | "metadata">) {
  // Remove my account
  // TODO: Move this to Repository pattern.
  await prisma.user.delete({
    where: {
      id: user.id,
    },
  });
}
