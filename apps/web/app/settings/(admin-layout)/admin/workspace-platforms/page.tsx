import { _generateMetadata, getTranslate } from "app/_utils";

import WorkspacePlatformsPage from "@calcom/features/ee/organizations/pages/settings/admin/WorkspacePlatformPage";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("workspace_platforms"),
    (t) => t("workspace_platforms_description")
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("workspace_platforms")} description={t("workspace_platforms_description")}>
      <WorkspacePlatformsPage />
    </SettingsHeader>
  );
};

export default Page;
