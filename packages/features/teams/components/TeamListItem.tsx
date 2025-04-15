import { useRouter } from "next/navigation";
import { useState } from "react";

import { MemberInvitationModalWithoutMembers } from "@calcom/features/teams/components/MemberInvitationModal";
import classNames from "@calcom/lib/classNames";
import { getTeamUrlSync } from "@calcom/lib/getBookerUrl/client";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  showToast,
  Tooltip,
} from "@calcom/ui";

import { TeamRole } from "./TeamPill";

interface Props {
  team: RouterOutputs["viewer"]["teams"]["list"][number];
  key: number;
  onActionSelect: (text: string) => void;
  isPending?: boolean;
  hideDropdown: boolean;
  setHideDropdown: (value: boolean) => void;
}

export default function TeamListItem(props: Props) {
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();
  const team = props.team;

  const showDialog = searchParams?.get("inviteModal") === "true";
  const [openMemberInvitationModal, setOpenMemberInvitationModal] = useState(showDialog);

  const isOwner = props.team.role === MembershipRole.OWNER;
  const isAdmin = props.team.role === MembershipRole.OWNER || props.team.role === MembershipRole.ADMIN;
  const { hideDropdown, setHideDropdown } = props;

  const hideInvitationModal = () => {
    setOpenMemberInvitationModal(false);
  };

  if (!team) return <></>;
  const teamUrl = getTeamUrlSync({ orgSlug: null, teamSlug: team.slug });
  const teamInfo = (
    <div className="item-center flex px-5 py-5">
      <div className="ms-3 inline-block truncate">
        <span className="text-default text-sm font-bold">{team.name}</span>
        <span className="text-muted block text-xs">{team.slug ?? teamUrl}</span>
      </div>
    </div>
  );

  return (
    <li>
      <MemberInvitationModalWithoutMembers
        hideInvitationModal={hideInvitationModal}
        showMemberInvitationModal={openMemberInvitationModal}
        teamId={team.id}
        token={team.inviteToken?.token}
        onSettingsOpen={() => null}
      />
      <div className={classNames("hover:bg-muted group flex items-center justify-between")}>
        <TeamPublishSection teamId={team.id}>{teamInfo}</TeamPublishSection>
        <div className="px-5 py-5">
          <div className="flex space-x-2 rtl:space-x-reverse">
            <TeamRole role={team.role} />
            <ButtonGroup combined>
              {team.slug && (
                <Tooltip content={t("copy_link_team")}>
                  <Button
                    color="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${getTeamUrlSync({
                          orgSlug: team.parent ? team.parent.slug : null,
                          teamSlug: team.slug,
                        })}`
                      );
                      showToast(t("link_copied"), "success");
                    }}
                    variant="icon"
                    StartIcon="link"
                  />
                </Tooltip>
              )}
              <Dropdown>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="radix-state-open:rounded-r-md"
                    type="button"
                    color="secondary"
                    variant="icon"
                    StartIcon="ellipsis"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent hidden={hideDropdown}>
                  {isAdmin && (
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        href={`/settings/teams/${team.id}/profile`}
                        StartIcon="pencil">
                        {t("edit_team") as string}
                      </DropdownItem>
                    </DropdownMenuItem>
                  )}
                  {!team.slug && <TeamPublishButton teamId={team.id} />}
                  {team.slug && (
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        target="_blank"
                        href={`${getTeamUrlSync({
                          orgSlug: team.parent ? team.parent.slug : null,
                          teamSlug: team.slug,
                        })}`}
                        StartIcon="external-link">
                        {t("preview_team") as string}
                      </DropdownItem>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        onClick={() => {
                          setOpenMemberInvitationModal(true);
                        }}
                        StartIcon="send">
                        {t("add_team_member") as string}
                      </DropdownItem>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {isOwner && (
                    <DropdownMenuItem>
                      <Dialog open={hideDropdown} onOpenChange={setHideDropdown}>
                        <DialogTrigger asChild>
                          <DropdownItem
                            color="destructive"
                            type="button"
                            StartIcon="trash"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}>
                            {t("disband_team")}
                          </DropdownItem>
                        </DialogTrigger>
                        <ConfirmationDialogContent
                          variety="danger"
                          title={t("disband_team")}
                          confirmBtnText={t("confirm_disband_team")}
                          isPending={props.isPending}
                          onConfirm={() => {
                            props.onActionSelect("disband");
                          }}>
                          {t("disband_team_confirmation_message")}
                        </ConfirmationDialogContent>
                      </Dialog>
                    </DropdownMenuItem>
                  )}

                  {!isOwner && (
                    <DropdownMenuItem>
                      <Dialog>
                        <DialogTrigger asChild>
                          <DropdownItem
                            color="destructive"
                            type="button"
                            StartIcon="log-out"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}>
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
      </div>
    </li>
  );
}

const TeamPublishButton = ({ teamId }: { teamId: number }) => {
  const { t } = useLocale();
  const router = useRouter();
  const publishTeamMutation = trpc.viewer.teams.publish.useMutation({
    onSuccess(data) {
      router.push(data.url);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  return (
    <DropdownMenuItem>
      <DropdownItem
        type="button"
        onClick={() => {
          publishTeamMutation.mutate({ teamId });
        }}
        StartIcon="globe">
        {t("team_publish")}
      </DropdownItem>
    </DropdownMenuItem>
  );
};

const TeamPublishSection = ({ children, teamId }: { children: React.ReactNode; teamId: number }) => {
  const router = useRouter();
  const publishTeamMutation = trpc.viewer.teams.publish.useMutation({
    onSuccess(data) {
      router.push(data.url);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  return (
    <button
      className="block flex-grow cursor-pointer truncate text-left text-sm"
      type="button"
      onClick={() => {
        publishTeamMutation.mutate({ teamId });
      }}>
      {children}
    </button>
  );
};
