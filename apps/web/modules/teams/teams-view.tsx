"use client";

import Shell from "@calcom/features/shell/Shell";
import { TeamsListing, CreateTeamDialog } from "@calcom/features/teams/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Button } from "@calcom/ui";

import type { getServerSideProps } from "@lib/teams/getServerSideProps";

export type PageProps = inferSSRProps<typeof getServerSideProps>;
function Teams() {
  const { t } = useLocale();
  const [user] = trpc.viewer.me.useSuspenseQuery();

  return (
    <Shell
      withoutMain={false}
      withoutSeo={true}
      heading={t("teams")}
      subtitle={t("create_manage_teams_collaborative")}
      title={t("teams")}
      description={t("create_manage_teams_collaborative")}
      hideHeadingOnMobile
      CTA={
        (!user.organizationId || user.organization.isOrgAdmin) && (
          <CreateTeamDialog>
            {({ open }) => (
              <Button data-testid="new-team-btn" variant="fab" StartIcon="plus" type="button" onClick={open}>
                {t("new")}
              </Button>
            )}
          </CreateTeamDialog>
        )
      }>
      <TeamsListing />
    </Shell>
  );
}

export default Teams;
