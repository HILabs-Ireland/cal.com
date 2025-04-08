import { describe, expect, it } from "vitest";

import { checkForEmptyAssignment } from "@calcom/lib/event-types/utils/checkForEmptyAssignment";

describe("Tests to Check if Event Types have empty Assignment", () => {
  it("should return true if event type has no hosts assigned", () => {
    expect(
      checkForEmptyAssignment({
        assignAllTeamMembers: false,
        hosts: [],
      })
    ).toBe(true);
  });
  it("should return false if assignAllTeamMembers is selected", () => {
    expect(
      checkForEmptyAssignment({
        assignAllTeamMembers: true,
        hosts: [],
      })
    ).toBe(false);
  });
  it("should return false if event type has hosts assigned", () => {
    expect(
      checkForEmptyAssignment({
        assignAllTeamMembers: false,
        hosts: [{ userId: 101, isFixed: false, priority: 2, weight: 100, scheduleId: null }],
      })
    ).toBe(false);
  });
});
