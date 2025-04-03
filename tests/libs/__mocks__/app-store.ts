import { beforeEach, vi } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

vi.mock("@calcom/app-store", () => appStoreMock);

beforeEach(() => {
  mockReset(appStoreMock);
});

const appStoreMock = mockDeep({
  fallbackMockImplementation: () => {
    throw new Error("Unimplemented");
  },
});
export default appStoreMock;
