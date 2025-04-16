import { useSession } from "next-auth/react";
import type { Dispatch } from "react";

import MemberInvitationModal from "@calcom/features/teams/components/MemberInvitationModal";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { showToast } from "@calcom/ui";

import type { UserTableAction } from "./types";

interface Props {
  dispatch: Dispatch<UserTableAction>;
}

export function InviteMemberModal(props: Props) {
  const { data: session } = useSession();
  const { t, i18n } = useLocale();
  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation({
    async onSuccess(data) {
      props.dispatch({ type: "CLOSE_MODAL" });

      if (Array.isArray(data.usernameOrEmail)) {
        showToast(
          t("email_invite_team_bulk", {
            userCount: data.numUsersInvited,
          }),
          "success"
        );
      } else {
        showToast(
          t("email_invite_team", {
            email: data.usernameOrEmail,
          }),
          "success"
        );
      }
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const orgId = session?.user.org?.id;

  if (!orgId) return null;

  return (
    <MemberInvitationModal
      members={[]}
      isOpen={true}
      onExit={() => {
        props.dispatch({
          type: "CLOSE_MODAL",
        });
      }}
      teamId={orgId}
      isOrg={true}
      isPending={inviteMemberMutation.isPending}
      onSubmit={(values) => {
        inviteMemberMutation.mutate({
          teamId: orgId,
          language: i18n.language,
          role: values.role,
          usernameOrEmail: values.emailOrUsername,
          isPlatform: false,
        });
      }}
    />
  );
}
