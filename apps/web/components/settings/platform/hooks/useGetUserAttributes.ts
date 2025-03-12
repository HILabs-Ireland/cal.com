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
};
