import { useState } from "react";

import { trackFormbricksAction } from "@calcom/lib/formbricks-client";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui";

import TeamListItem from "./TeamListItem";

interface Props {
  teams: RouterOutputs["viewer"]["teams"]["list"];
}

export default function TeamList(props: Props) {
  const utils = trpc.useUtils();

  const { t } = useLocale();
  const { data: user } = trpc.viewer.me.useQuery();

  const [hideDropdown, setHideDropdown] = useState(false);

  function selectAction(action: string, teamId: number) {
    switch (action) {
      case "disband":
        deleteTeam(teamId);
        break;
    }
  }

  const deleteTeamMutation = trpc.viewer.teams.delete.useMutation({
    async onSuccess() {
      await utils.viewer.teams.list.invalidate();
      trackFormbricksAction("team_disbanded");
    },
    async onError(err) {
      showToast(err.message, "error");
    },
  });

  function deleteTeam(teamId: number) {
    deleteTeamMutation.mutate({ teamId });
  }

  if (!user) return null;

  return (
    <ul className="bg-default divide-subtle border-subtle mb-2 divide-y overflow-hidden rounded-md border">
      {props.teams.map((team) => (
        <TeamListItem
          key={team?.id as number}
          team={team}
          onActionSelect={(action: string) => selectAction(action, team?.id as number)}
          isPending={deleteTeamMutation.isPending}
          hideDropdown={hideDropdown}
          setHideDropdown={setHideDropdown}
        />
      ))}
    </ul>
  );
}
