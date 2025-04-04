import {
  enableEmailFeature,
  mockNoTranslations,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { beforeEach, afterEach } from "vitest";

export function setupAndTeardown() {
  beforeEach(() => {
    // Required to able to generate token in email in some cases
    //@ts-expect-error - It is a readonly variable
    process.env.CALENDSO_ENCRYPTION_KEY = "abcdefghjnmkljhjklmnhjklkmnbhjui";
    // We are setting it in vitest.config.ts because otherwise it's too late to set it.

    // Ensure that Rate Limiting isn't enforced for tests
    delete process.env.UNKEY_ROOT_KEY;
    mockNoTranslations();
    // mockEnableEmailFeature();
    enableEmailFeature();
    globalThis.testEmails = [];
    fetchMock.resetMocks();
  });
  afterEach(() => {
    //@ts-expect-error - It is a readonly variable
    delete process.env.CALENDSO_ENCRYPTION_KEY;
    globalThis.testEmails = [];
    fetchMock.resetMocks();
    // process.env.DAILY_API_KEY = "MOCK_DAILY_API_KEY";
  });
}
