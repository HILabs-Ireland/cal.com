import type { AppCategories } from "@prisma/client";

// If you import this file on any app it should produce circular dependency
// import appStore from "./index";
import type { EventLocationType } from "@calcom/app-store/locations";
import type { AppMeta } from "@calcom/types/App";
import type { CredentialPayload } from "@calcom/types/Credential";

export type LocationOption = {
  label: string;
  value: EventLocationType["type"];
  icon?: string;
  disabled?: boolean;
};

export type CredentialDataWithTeamName = CredentialPayload & {
  team?: {
    name: string;
  } | null;
};

export function getAppFromSlug(slug: string | undefined): AppMeta | undefined {
  return undefined;
}

export function getAppFromLocationValue(type: string): AppMeta | undefined {
  return undefined;
}

/**
 *
 * @param appCategories - from app metadata
 * @param concurrentMeetings - from app metadata
 * @returns - true if app supports team install
 */
export function doesAppSupportTeamInstall({
  appCategories,
  concurrentMeetings = undefined,
}: {
  appCategories: string[];
  concurrentMeetings: boolean | undefined;
}) {
  return !appCategories.some(
    (category) =>
      category === "calendar" ||
      (defaultVideoAppCategories.includes(category as AppCategories) && !concurrentMeetings)
  );
}

export function isConferencing(appCategories: string[]) {
  return appCategories.some((category) => category === "conferencing" || category === "video");
}
export const defaultVideoAppCategories: AppCategories[] = [
  "messaging",
  "conferencing",
  // Legacy name for conferencing
  "video",
];

export default () => [];
