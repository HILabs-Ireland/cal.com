import { _generateMetadata, getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import LegacyPage from "@calcom/features/teams/pages/team-profile-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("profile"),
    (t) => t("profile_team_description")
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <SettingsHeader
      title={t("profile")}
      description={t("profile_team_description")}
      borderInShellHeader={true}>
      <LegacyPage />
    </SettingsHeader>
  );
};

export default Page;
