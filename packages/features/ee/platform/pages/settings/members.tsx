"use client";

import Shell from "@calcom/features/shell/Shell";
import { UserListTable } from "@calcom/features/users/components/UserTable/UserListTable";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui";
import { useGetUserAttributes } from "@calcom/web/components/settings/platform/hooks/useGetUserAttributes";

const PlatformMembersView = () => {
  const { t } = useLocale();
  const { isUserLoading, isPlatformUser, userOrgId } = useGetUserAttributes();
  const { data: currentOrg, isPending } = trpc.viewer.organizations.listCurrent.useQuery();

  const isOrgAdminOrOwner =
    currentOrg &&
    (currentOrg.user.role === MembershipRole.OWNER || currentOrg.user.role === MembershipRole.ADMIN);

  const canLoggedInUserSeeMembers =
    (currentOrg?.isPrivate && isOrgAdminOrOwner) || isOrgAdminOrOwner || !currentOrg?.isPrivate;

  if (isUserLoading) {
    return <div className="m-5">Loading...</div>;
  }

  if (!isPlatformUser)
    return (
      <div>
        <Shell isPlatformUser={true} withoutMain={false} SidebarContainer={<></>} />
      </div>
    );

  return (
    <Shell
      heading={
        <div className="flex">
          <h1>Member management</h1>
          <Button
            tooltip="Only teammates invited as admins can create OAuth clients while teammates invited as members have read only access"
            tooltipSide="right"
            className="mx-2 hover:bg-transparent"
            color="minimal"
            variant="icon"
            StartIcon="info"
          />
        </div>
      }
      title={t("platform_members")}
      subtitle={t("platform_members_description")}
      hideHeadingOnMobile
      withoutMain={false}
      isPlatformUser={true}>
      <div>{!isPending && canLoggedInUserSeeMembers && <UserListTable />}</div>
    </Shell>
  );
};

export default PlatformMembersView;
