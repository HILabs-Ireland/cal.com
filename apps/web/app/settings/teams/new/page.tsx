import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import CreateTeamView from "~/settings/teams/new/create-team-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_new_team"),
    (t) => t("create_new_team_description")
  );

export default WithLayout({ Page: CreateTeamView });
