import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert, Button, EmptyScreen } from "@calcom/ui";

import SkeletonLoaderTeamList from "./SkeletonloaderTeamList";
import TeamList from "./TeamList";

export function TeamsListing() {
  const { t } = useLocale();
  const router = useRouter();
  const { data, isPending, error } = trpc.viewer.teams.list.useQuery();
  const teams = useMemo(() => data?.filter((m) => m.accepted) || [], [data]);

  if (isPending) return <SkeletonLoaderTeamList />;

  return (
    <>
      {error && <Alert severity="error" title={error.message} />}
      {teams.length ? (
        <TeamList teams={teams} />
      ) : (
        <EmptyScreen
          Icon="users"
          headline={t("create_team_to_get_started")}
          description={t(
            "create_first_team_and_add_others",
            "Create your first team and add other users to work together."
          )}
          buttonRaw={
            <Button
              color="secondary"
              data-testid="create-team-btn"
              tooltip={t("create_new_team")}
              onClick={() => router.push(`${WEBAPP_URL}/settings/teams/new?returnTo=${WEBAPP_URL}/teams`)}>
              {t("create_new_team")}
            </Button>
          }
        />
      )}
    </>
  );
}
