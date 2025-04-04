"use client";

import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

import Shell from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { showToast } from "@calcom/ui";

import { useOAuthClients } from "@lib/hooks/settings/platform/oauth-clients/useOAuthClients";
import { useDeleteOAuthClient } from "@lib/hooks/settings/platform/oauth-clients/usePersistOAuthClient";

import { OAuthClientsList } from "@components/settings/platform/dashboard/oauth-clients-list";
import { useGetUserAttributes } from "@components/settings/platform/hooks/useGetUserAttributes";

const queryClient = new QueryClient();

export default function Platform() {
  const { t } = useLocale();
  const { data, isLoading: isOAuthClientLoading, refetch: refetchClients } = useOAuthClients();

  const { isUserLoading, isPlatformUser } = useGetUserAttributes();

  const { mutateAsync, isPending: isDeleting } = useDeleteOAuthClient({
    onSuccess: () => {
      showToast(t("oauth_client_deletion_message"), "success");
      refetchClients();
    },
  });

  const handleDelete = async (id: string) => {
    await mutateAsync({ id: id });
  };

  if (isUserLoading || isOAuthClientLoading) return <div className="m-5">Loading...</div>;

  if (isPlatformUser) {
    return (
      <QueryClientProvider client={queryClient}>
        <div>
          <Shell
            heading={t("platform")}
            subtitle={t("platform_description")}
            title={t("platform")}
            description={t("platform_description")}
            hideHeadingOnMobile
            withoutSeo={true}
            withoutMain={false}
            isPlatformUser={true}>
            <OAuthClientsList oauthClients={data} isDeleting={isDeleting} handleDelete={handleDelete} />
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
        withoutSeo={true}
        SidebarContainer={<></>}
      />
    </div>
  );
}
