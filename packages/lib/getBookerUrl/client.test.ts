import { describe, it, vi, expect } from "vitest";

import { getTeamUrlSync } from "./client";
import * as getBookerBaseUrlSyncExport from "./getBookerBaseUrlSync";

vi.mock("./getBookerBaseUrlSync", async () => {
  return {
    getBookerBaseUrlSync: vi.fn(),
  };
});

describe("getBookerUrl:client", () => {
  describe("getTeamUrlSync", () => {
    it("if orgSlug is null, it should return a URL with /team in it", () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      getBookerBaseUrlSyncExport.getBookerBaseUrlSync.mockReturnValueOnce("https://abc.com");
      const url = getTeamUrlSync({ teamSlug: "myTeam" });
      expect(url).toBe("https://abc.com/team/myTeam");
    });
  });
});
