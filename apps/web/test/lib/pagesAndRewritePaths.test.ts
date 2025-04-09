import { it, expect, describe } from "vitest";

import { pages } from "../../pagesAndRewritePaths.js";

describe("pagesAndRewritePaths", () => {
  describe("beforeFiles must exclude routes in pages/app router", () => {
    const BEFORE_REWRITE_EXCLUDE_PAGES = [
      "availability",
      "booking",
      "connect-and-join",
      "error",
      "getting-started",
      "maintenance",
      "more",
      "not-found",
      "reschedule",
      "settings",
      "teams",
      "403",
      "500",
      "bookings",
      "event-types",
      "icons",
      "org",
      "signup",
      "team",
      "d",
    ];

    it("should include all required routes", () => {
      BEFORE_REWRITE_EXCLUDE_PAGES.forEach((route) => {
        expect(pages).toContain(route);
      });
    });
  });
});
