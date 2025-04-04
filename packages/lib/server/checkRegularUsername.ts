import slugify from "@calcom/lib/slugify";

import { ProfileRepository } from "./repository/profile";
import { isUsernameReservedDueToMigration } from "./username";

export async function checkRegularUsername(_username: string, currentOrgDomain?: string | null) {
  const isCheckingUsernameInGlobalNamespace = !currentOrgDomain;
  const username = slugify(_username);

  const profiles = currentOrgDomain
    ? await ProfileRepository.findManyByOrgSlugOrRequestedSlug({
        orgSlug: currentOrgDomain,
        usernames: [username],
      })
    : null;

  const user = profiles?.length ? profiles[0].user : null;

  if (user) {
    return {
      available: false as const,
      message: "A user exists with that username",
    };
  }

  const isUsernameAvailable = isCheckingUsernameInGlobalNamespace
    ? !(await isUsernameReservedDueToMigration(username))
    : true;

  return {
    available: isUsernameAvailable,
  };
}
