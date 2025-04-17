import Link from "next/link";
import { useState } from "react";

import { MemberInvitationModalWithoutMembers } from "@calcom/features/teams/components/MemberInvitationModal";
import classNames from "@calcom/lib/classNames";
import { getTeamUrlSync } from "@calcom/lib/getBookerUrl/client";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import {
  Button,
  ButtonGroup,
  ConfirmationDialogContent,
  Dialog,
  DialogTrigger,
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
} from "@calcom/ui";

import TeamRoleTag from "./TeamRoleTag";

interface Props {
  team: RouterOutputs["viewer"]["teams"]["list"][number];
  key: number;
  onActionSelect: (text: string) => void;
  isPending?: boolean;
  hideDropdown: boolean;
  setHideDropdown: (value: boolean) => void;
}

export default function TeamListItem({
  team,
  onActionSelect,
  isPending,
  hideDropdown,
  setHideDropdown,
}: Props) {
  const { t } = useLocale();
  const [openMemberAddModal, setOpenMemberAddModal] = useState(
    useCompatSearchParams()?.get("inviteModal") === "true"
  );
  const isOwner = team.role === MembershipRole.OWNER;
  const isAdmin = isOwner || team.role === MembershipRole.ADMIN;
  const teamUrl = getTeamUrlSync({ orgSlug: null, teamSlug: team.slug });

  if (!team) return null;

  return (
    <li>
      <MemberInvitationModalWithoutMembers
        hideInvitationModal={() => setOpenMemberAddModal(false)}
        showMemberInvitationModal={openMemberAddModal}
        teamId={team.id}
        token={team.inviteToken?.token}
      />
      <div className={classNames("hover:bg-muted group flex items-center justify-between")}>
        <Link href={`/settings/teams/${team.id}/profile`} className="flex w-full items-center">
          <div className="ms-3 inline-block truncate px-5 py-5">
            <span className="text-default text-sm font-bold">{team.name}</span>
            <span className="text-muted block text-xs">{team.slug ?? teamUrl}</span>
          </div>
        </Link>
        <div className="flex space-x-2 px-5 py-5 rtl:space-x-reverse">
          <TeamRoleTag role={team.role} />
          <ButtonGroup combined>
            {isAdmin && (
              <Tooltip content={t("edit_team")}>
                <Button
                  color="secondary"
                  variant="icon"
                  StartIcon="pencil"
                  href={`/settings/teams/${team.id}/profile`}
                  data-testid="edit-team-button"
                />
              </Tooltip>
            )}
            {isAdmin && (
              <Tooltip content={t("add_team_member")}>
                <Button
                  color="secondary"
                  variant="icon"
                  StartIcon="user-plus"
                  onClick={() => setOpenMemberAddModal(true)}
                />
              </Tooltip>
            )}
            {team.slug && (
              <Tooltip content={t("preview_team")}>
                <Button
                  color="secondary"
                  variant="icon"
                  StartIcon="external-link"
                  href={teamUrl}
                  target="_blank"
                  data-testid="preview-team-button"
                />
              </Tooltip>
            )}
            <Dropdown>
              <DropdownMenuTrigger asChild>
                <Button color="secondary" variant="icon" StartIcon="ellipsis" />
              </DropdownMenuTrigger>
              <DropdownMenuContent hidden={hideDropdown}>
                {isOwner ? (
                  <DropdownMenuItem>
                    <Dialog open={hideDropdown} onOpenChange={setHideDropdown}>
                      <DialogTrigger asChild>
                        <DropdownItem
                          color="destructive"
                          StartIcon="trash"
                          onClick={(e) => e.stopPropagation()}>
                          {t("disband_team")}
                        </DropdownItem>
                      </DialogTrigger>
                      <ConfirmationDialogContent
                        variety="danger"
                        title={t("disband_team")}
                        confirmBtnText={t("confirm_disband_team")}
                        isPending={isPending}
                        onConfirm={() => onActionSelect("disband")}>
                        {t("disband_team_confirmation_message")}
                      </ConfirmationDialogContent>
                    </Dialog>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem>
                    <Dialog>
                      <DialogTrigger asChild>
                        <DropdownItem
                          color="destructive"
                          StartIcon="log-out"
                          onClick={(e) => e.stopPropagation()}>
                          {t("leave_team")}
                        </DropdownItem>
                      </DialogTrigger>
                    </Dialog>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </Dropdown>
          </ButtonGroup>
        </div>
      </div>
    </li>
  );
}
