import type { EventTypeHosts } from "@calcom/features/eventtypes/components/EventType";

// This function checks if EventType requires assignment.
// returns true: if EventType requires assignment but there is no assignment yet done by the user.
// returns false: for all other scenarios.
export function checkForEmptyAssignment({
  hosts,
  assignAllTeamMembers,
}: {
  hosts: EventTypeHosts;
  assignAllTeamMembers: boolean;
}): boolean {
  // If Team-events have assignAllTeamMembers checked, return false as assignemnt is complete.
  if (assignAllTeamMembers) {
    return false;
  }

  // Check if hosts are empty
  return hosts.length === 0;
}
