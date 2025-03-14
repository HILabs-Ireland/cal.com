import { vi, beforeEach } from "vitest";

import type * as constants from "@calcom/lib/constants";

const mockedConstants = {
  IS_PRODUCTION: false,
  WEBSITE_URL: "",
} as typeof constants;

vi.mock("@calcom/lib/constants", () => {
  return mockedConstants;
});

beforeEach(() => {
  Object.entries(mockedConstants).forEach(([key]) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete mockedConstants[key];
  });
});

export const constantsScenarios = {
  setWebsiteUrl: (url: string) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    mockedConstants.WEBSITE_URL = url;
  },
};
