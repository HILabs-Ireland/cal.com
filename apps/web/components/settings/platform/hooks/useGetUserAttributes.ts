<<<<<<< HEAD
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { useCheckTeamBilling } from "@calcom/web/lib/hooks/settings/platform/oauth-clients/usePersistOAuthClient";

export const useGetUserAttributes = () => {
  const { data: user, isLoading: isUserLoading } = useMeQuery();
  const { data: userBillingData, isFetching: isUserBillingDataLoading } = useCheckTeamBilling(
    user?.organizationId
  );
  const isPlatformUser = user?.organization.isPlatform;
  const isPaidUser = userBillingData?.valid;
  const userOrgId = user?.organizationId;

  return { isUserLoading, isUserBillingDataLoading, isPlatformUser, isPaidUser, userBillingData, userOrgId };
=======
import { usePlatformMe } from "./usePlatformMe";

export const useGetUserAttributes = () => {
  const { data: platformUser, isLoading: isPlatformUserLoading } = usePlatformMe();
  const isPlatformUser = platformUser?.organization?.isPlatform ?? false;
  const userOrgId = platformUser?.organizationId;

  return {
    isUserLoading: isPlatformUserLoading,
    isPlatformUser,
    userOrgId,
  };
>>>>>>> 79bd2d1104 (Remove global vars and dedicated js files)
};
