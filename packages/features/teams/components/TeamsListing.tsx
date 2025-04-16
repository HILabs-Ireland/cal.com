import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { CreateTeamDialog } from "@calcom/features/teams/components";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert, Button, EmptyScreen, Label, showToast } from "@calcom/ui";

import SkeletonLoaderTeamList from "./SkeletonloaderTeamList";
import TeamList from "./TeamList";

export function TeamsListing() {
  const searchParams = useCompatSearchParams();
  const token = searchParams?.get("token");
  const { t } = useLocale();
  const trpcContext = trpc.useUtils();
  const router = useRouter();

  const [inviteTokenChecked, setInviteTokenChecked] = useState(false);

  const { data, isPending, error } = trpc.viewer.teams.list.useQuery(
    {
      includeOrgs: true,
    },
    {
      enabled: inviteTokenChecked,
    }
  );

  const { data: user } = trpc.viewer.me.useQuery();

  const { mutate: inviteMemberByToken } = trpc.viewer.teams.inviteMemberByToken.useMutation({
    onSuccess: (teamName) => {
      trpcContext.viewer.teams.list.invalidate();
      showToast(t("team_invite_received", { teamName }), "success");
    },
    onError: (e) => {
      showToast(e.message, "error");
    },
    onSettled: () => {
      setInviteTokenChecked(true);
    },
  });

  const teams = useMemo(() => data?.filter((m) => m.accepted && !m.isOrganization) || [], [data]);

  const teamInvites = useMemo(() => data?.filter((m) => !m.accepted && !m.isOrganization) || [], [data]);

  const organizationInvites = (data?.filter((m) => !m.accepted && m.isOrganization) || []).filter(
    (orgInvite) => {
      const isThereASubTeamOfTheOrganizationInInvites = teamInvites.find(
        (teamInvite) => teamInvite.parentId === orgInvite.id
      );
      // Accepting a subteam invite automatically accepts the invite for the parent organization. So, need to show such an organization's invite
      return !isThereASubTeamOfTheOrganizationInInvites;
    }
  );

  const isCreateTeamButtonDisabled = !!(user?.organizationId && !user?.organization?.isOrgAdmin);

  useEffect(() => {
    if (!router) return;
    if (token) inviteMemberByToken({ token });
    else setInviteTokenChecked(true);
  }, [router, inviteMemberByToken, setInviteTokenChecked, token]);

  if (isPending || !inviteTokenChecked) {
    return <SkeletonLoaderTeamList />;
  }

  return (
    <>
      {!!error && <Alert severity="error" title={error.message} />}

      {organizationInvites.length > 0 && (
        <div className="bg-subtle mb-6 rounded-md p-5">
          <Label className="text-emphasis pb-2  font-semibold">{t("pending_organization_invites")}</Label>
          <TeamList teams={organizationInvites} pending />
        </div>
      )}

      {teamInvites.length > 0 && (
        <div className="bg-subtle mb-6 rounded-md p-5">
          <Label className="text-emphasis pb-2  font-semibold">{t("pending_invites")}</Label>
          <TeamList teams={teamInvites} pending />
        </div>
      )}

      {teams.length > 0 ? (
        <TeamList teams={teams} />
      ) : (
        <EmptyScreen
          Icon="users"
          headline={t("create_team_to_get_started")}
          description={t("create_first_team_and_invite_others")}
          buttonRaw={
            <CreateTeamDialog>
              {({ setOpen }) => (
                <Button
                  color="secondary"
                  data-testid="create-team-btn"
                  disabled={!!isCreateTeamButtonDisabled}
                  tooltip={
                    isCreateTeamButtonDisabled ? t("org_admins_can_create_new_teams") : t("create_new_team")
                  }
                  onClick={() => setOpen(true)}>
                  {t(`create_new_team`)}
                </Button>
              )}
            </CreateTeamDialog>
          }
        />
      )}
    </>
  );
}
