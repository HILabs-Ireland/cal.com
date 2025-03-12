import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import Shell from "@calcom/features/shell/Shell";
import { showToast } from "@calcom/ui";

import {
  useOAuthClients,
  useGetOAuthClientManagedUsers,
} from "@lib/hooks/settings/platform/oauth-clients/useOAuthClients";
import { useDeleteOAuthClient } from "@lib/hooks/settings/platform/oauth-clients/usePersistOAuthClient";

<<<<<<< HEAD:apps/web/pages/settings/platform/index.tsx
import PageWrapper from "@components/PageWrapper";
import { ManagedUserList } from "@components/settings/platform/dashboard/managed-user-list";
=======
import { HelpCards } from "@components/settings/platform/dashboard/HelpCards";
>>>>>>> 79bd2d1104 (Remove global vars and dedicated js files):apps/web/modules/settings/platform/platform-view.tsx
import { OAuthClientsList } from "@components/settings/platform/dashboard/oauth-clients-list";
import { useGetUserAttributes } from "@components/settings/platform/hooks/useGetUserAttributes";
import { PlatformPricing } from "@components/settings/platform/pricing/platform-pricing";

const queryClient = new QueryClient();

export default function Platform() {
<<<<<<< HEAD:apps/web/pages/settings/platform/index.tsx
  const [initialClientId, setInitialClientId] = useState("");
  const [initialClientName, setInitialClientName] = useState("");

=======
  const { t } = useLocale();
>>>>>>> 79bd2d1104 (Remove global vars and dedicated js files):apps/web/modules/settings/platform/platform-view.tsx
  const { data, isLoading: isOAuthClientLoading, refetch: refetchClients } = useOAuthClients();
  const {
    isLoading: isManagedUserLoading,
    data: managedUserData,
    refetch: refetchManagedUsers,
  } = useGetOAuthClientManagedUsers(initialClientId);

  const { isUserLoading, isPlatformUser, isPaidUser, userOrgId } = useGetUserAttributes();

  const { mutateAsync, isPending: isDeleting } = useDeleteOAuthClient({
    onSuccess: () => {
      showToast("OAuth client deleted successfully", "success");
      refetchClients();
      refetchManagedUsers();
    },
  });

  const handleDelete = async (id: string) => {
    await mutateAsync({ id: id });
  };

  useEffect(() => {
    setInitialClientId(data[0]?.id);
    setInitialClientName(data[0]?.name);
  }, [data]);

  if (isUserLoading || isOAuthClientLoading) return <div className="m-5">Loading...</div>;

<<<<<<< HEAD:apps/web/pages/settings/platform/index.tsx
  if (isUserBillingDataLoading && !userBillingData) {
    return <div className="m-5">Loading...</div>;
  }

  if (isPlatformUser && !isPaidUser) return <PlatformPricing teamId={userOrgId} />;
=======
  if (isPlatformUser && !isPaidUser)
    return (
      <PlatformPricing
        teamId={userOrgId}
        heading={
          <div className="mb-5 text-center text-2xl font-semibold">
            <h1>Subscribe to Platform</h1>
          </div>
        }
      />
    );
>>>>>>> 79bd2d1104 (Remove global vars and dedicated js files):apps/web/modules/settings/platform/platform-view.tsx

  if (isPlatformUser) {
    return (
      <QueryClientProvider client={queryClient}>
        <div>
          <Shell
            heading="Platform"
            title="Platform"
            hideHeadingOnMobile
            withoutMain={false}
            subtitle="Manage everything related to platform."
            isPlatformUser={true}>
            <OAuthClientsList oauthClients={data} isDeleting={isDeleting} handleDelete={handleDelete} />
            <ManagedUserList
              oauthClients={data}
              managedUsers={managedUserData}
              isManagedUserLoading={isManagedUserLoading}
              initialClientName={initialClientName}
              initialClientId={initialClientId}
              handleChange={(id: string, name: string) => {
                setInitialClientId(id);
                setInitialClientName(name);
                refetchManagedUsers();
              }}
            />
          </Shell>
        </div>
      </QueryClientProvider>
    );
  }

  return (
    <div>
      <Shell
        // we want to hide org banner and have different sidebar tabs for platform clients
        // hence we pass isPlatformUser boolean as prop
        isPlatformUser={true}
        hideHeadingOnMobile
        withoutMain={false}
<<<<<<< HEAD:apps/web/pages/settings/platform/index.tsx
        SidebarContainer={<></>}>
        You are not subscribed to a Platform plan.
      </Shell>
=======
        withoutSeo={true}
        SidebarContainer={<></>}
      />
>>>>>>> 79bd2d1104 (Remove global vars and dedicated js files):apps/web/modules/settings/platform/platform-view.tsx
    </div>
  );
}

Platform.PageWrapper = PageWrapper;
