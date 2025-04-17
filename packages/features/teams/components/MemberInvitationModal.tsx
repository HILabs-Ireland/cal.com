import { useSession } from "next-auth/react";
import type { FormEvent } from "react";
import { useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { MAX_NB_INVITES } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import { isEmail } from "@calcom/trpc/server/routers/viewer/teams/util";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  Form,
  Icon,
  Label,
  Select,
  showToast,
  TextAreaField,
  TextField,
  ToggleGroup,
} from "@calcom/ui";

import type { PendingMember } from "../lib/types";

type MemberInvitationModalProps = {
  isOpen: boolean;
  onExit: () => void;
  onSubmit: (values: NewMemberForm, resetFields: () => void) => void;
  teamId: number;
  members?: PendingMember[];
  token?: string;
  isPending?: boolean;
  isOrg?: boolean;
  checkMembershipMutation?: boolean;
};

type MembershipRoleOption = {
  value: MembershipRole;
  label: string;
};

export interface NewMemberForm {
  emailOrUsername: string | string[];
  role: MembershipRole;
}

type ModalMode = "INDIVIDUAL" | "BULK" | "ORGANIZATION";

interface FileEvent<T = Element> extends FormEvent<T> {
  target: EventTarget & T;
}

function toggleElementInArray(value: string[] | string | undefined, element: string): string[] {
  const array = value ? (Array.isArray(value) ? value : [value]) : [];
  return array.includes(element) ? array.filter((item) => item !== element) : [...array, element];
}

export default function MemberInvitationModal(props: MemberInvitationModalProps) {
  const { t } = useLocale();
  const { isOrg = false } = props;
  const trpcContext = trpc.useUtils();
  const session = useSession();

  const checkIfMembershipExistsMutation = trpc.viewer.teams.checkIfMembershipExists.useMutation();

  const [modalImportMode, setModalInputMode] = useState<ModalMode>("INDIVIDUAL");

  const options: MembershipRoleOption[] = useMemo(() => {
    const options: MembershipRoleOption[] = [
      { value: MembershipRole.MEMBER, label: t("member") },
      { value: MembershipRole.ADMIN, label: t("admin") },
      { value: MembershipRole.OWNER, label: t("owner") },
    ];

    return options;
  }, [t, isOrg]);

  const toggleGroupOptions = useMemo(() => {
    const array = [
      {
        value: "INDIVIDUAL",
        label: t("invite_team_individual_segment"),
        iconLeft: <Icon name="user" />,
      },
      { value: "BULK", label: t("invite_team_bulk_segment"), iconLeft: <Icon name="users" /> },
    ];
    return array;
  }, [t]);

  const newMemberFormMethods = useForm<NewMemberForm>();

  const checkIfMembershipExists = (value: string) => {
    if (props.checkMembershipMutation) {
      return checkIfMembershipExistsMutation.mutateAsync({
        teamId: props.teamId,
        value,
      });
    } else {
      if (!props?.members?.length) return false;
      return (
        props?.members.some((member) => member?.username === value) ||
        props?.members.some((member) => member?.email === value)
      );
    }
  };

  const handleFileUpload = (e: FileEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) {
      return;
    }
    const file = e.target.files[0];

    if (file) {
      const reader = new FileReader();
      const emailRegex = /^([A-Z0-9_+-]+\.?)*[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i;
      reader.onload = (e) => {
        const contents = e?.target?.result as string;
        const lines = contents.split("\n");
        const validEmails = [];
        for (const line of lines) {
          const columns = line.split(/,|;|\|| /);
          for (const column of columns) {
            const email = column.trim().toLowerCase();

            if (emailRegex.test(email)) {
              validEmails.push(email);
              break; // Stop checking columns if a valid email is found in this line
            }
          }
        }

        newMemberFormMethods.setValue("emailOrUsername", validEmails);
      };

      reader.readAsText(file);
    }
  };

  const resetFields = () => {
    newMemberFormMethods.reset();
    newMemberFormMethods.setValue("emailOrUsername", "");
    newMemberFormMethods.setValue("role", options[0].value);
    setModalInputMode("INDIVIDUAL");
  };

  const importRef = useRef<HTMLInputElement | null>(null);

  return (
    <Dialog
      name="inviteModal"
      open={props.isOpen}
      onOpenChange={() => {
        props.onExit();
        newMemberFormMethods.reset();
      }}>
      <DialogContent enableOverflow type="creation" title={t("add_team_member")}>
        <div className="sm:max-h-9">
          <Label className="sr-only" htmlFor="role">
            {t("import_mode")}
          </Label>
          <ToggleGroup
            isFullWidth={true}
            className="flex-col sm:flex-row"
            onValueChange={(val) => {
              setModalInputMode(val as ModalMode);
              newMemberFormMethods.clearErrors();
            }}
            defaultValue={modalImportMode}
            options={toggleGroupOptions}
          />
        </div>

        <Form form={newMemberFormMethods} handleSubmit={(values) => props.onSubmit(values, resetFields)}>
          <div className="mb-10 mt-6 space-y-6">
            {/* Indivdual Invite */}
            {modalImportMode === "INDIVIDUAL" && (
              <Controller
                name="emailOrUsername"
                control={newMemberFormMethods.control}
                rules={{
                  required: t("enter_email"),
                  validate: async (value) => {
                    // orgs can only invite members by email
                    if (typeof value === "string" && !isEmail(value)) return t("enter_email");
                    if (typeof value === "string") {
                      const doesInviteExists = await checkIfMembershipExists(value);
                      return !doesInviteExists || t("member_already_invited");
                    }
                  },
                }}
                render={({ field: { onChange }, fieldState: { error } }) => (
                  <>
                    <TextField
                      label={t("email")}
                      id="inviteUser"
                      name="inviteUser"
                      placeholder="email@example.com"
                      required
                      onChange={(e) => onChange(e.target.value.trim().toLowerCase())}
                    />
                    {error && <span className="text-sm text-red-800">{error.message}</span>}
                  </>
                )}
              />
            )}
            {/* Bulk Invite */}
            {modalImportMode === "BULK" && (
              <div className="bg-muted flex flex-col rounded-md p-4">
                <Controller
                  name="emailOrUsername"
                  control={newMemberFormMethods.control}
                  rules={{
                    required: t("enter_email"),
                    validate: (value) => {
                      if (Array.isArray(value) && value.some((email) => !isEmail(email)))
                        return t("enter_emails");
                      if (Array.isArray(value) && value.length > MAX_NB_INVITES)
                        return t("too_many_invites", { nbUsers: MAX_NB_INVITES });
                      if (typeof value === "string" && !isEmail(value)) return t("enter_email");
                    },
                  }}
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <>
                      {/* TODO: Make this a fancy email input that styles on a successful email. */}
                      <TextAreaField
                        name="emails"
                        label={t("invite_via_email")}
                        rows={4}
                        autoCorrect="off"
                        placeholder="john@doe.com, alex@smith.com"
                        required
                        value={value}
                        onChange={(e) => {
                          const targetValues = e.target.value.split(/[\n,]/);
                          const emails =
                            targetValues.length === 1
                              ? targetValues[0].trim().toLocaleLowerCase()
                              : targetValues.map((email) => email.trim().toLocaleLowerCase());

                          return onChange(emails);
                        }}
                      />
                      {error && <span className="text-sm text-red-800">{error.message}</span>}
                    </>
                  )}
                />

                <Button
                  type="button"
                  color="secondary"
                  onClick={() => {
                    if (importRef.current) {
                      importRef.current.click();
                    }
                  }}
                  StartIcon="paperclip"
                  className="mt-3 justify-center stroke-2">
                  {t("upload_csv_file")}
                </Button>
                <input
                  ref={importRef}
                  hidden
                  id="bulkInvite"
                  type="file"
                  accept=".csv"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
              </div>
            )}
            <Controller
              name="role"
              control={newMemberFormMethods.control}
              defaultValue={options[0].value}
              render={({ field: { onChange } }) => (
                <div>
                  <Label className="text-emphasis font-medium" htmlFor="role">
                    {t("invite_as")}
                  </Label>
                  <Select
                    id="role"
                    defaultValue={options[0]}
                    options={options}
                    onChange={(val) => {
                      if (val) onChange(val.value);
                    }}
                  />
                </div>
              )}
            />
          </div>
          <DialogFooter showDivider>
            <Button
              type="button"
              color="minimal"
              onClick={() => {
                props.onExit();
                resetFields();
              }}>
              {t("cancel")}
            </Button>
            <Button
              loading={props.isPending || checkIfMembershipExistsMutation.isPending}
              type="submit"
              color="primary"
              className="me-2 ms-2"
              data-testid="add-new-member-button">
              {t("send_invite")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export const MemberInvitationModalWithoutMembers = ({
  hideInvitationModal,
  showMemberInvitationModal,
  teamId,
  token,
  ...props
}: Partial<MemberInvitationModalProps> & {
  hideInvitationModal: () => void;
  showMemberInvitationModal: boolean;
  teamId: number;
  token?: string;
}) => {
  const searchParams = useCompatSearchParams();
  const { t, i18n } = useLocale();
  const utils = trpc.useUtils();

  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation();

  return (
    <MemberInvitationModal
      {...props}
      isPending={inviteMemberMutation.isPending}
      isOpen={showMemberInvitationModal}
      teamId={teamId}
      token={token}
      onExit={hideInvitationModal}
      checkMembershipMutation={true}
      onSubmit={(values, resetFields) => {
        inviteMemberMutation.mutate(
          {
            teamId,
            language: i18n.language,
            role: values.role,
            usernameOrEmail: values.emailOrUsername,
          },
          {
            onSuccess: async (data) => {
              await utils.viewer.teams.get.invalidate();
              await utils.viewer.teams.listMembers.invalidate();
              hideInvitationModal();

              if (Array.isArray(data.usernameOrEmail)) {
                showToast(
                  t("email_invite_team_bulk", {
                    userCount: data.numUsersInvited,
                  }),
                  "success"
                );
                resetFields();
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
          }
        );
      }}
    />
  );
};
