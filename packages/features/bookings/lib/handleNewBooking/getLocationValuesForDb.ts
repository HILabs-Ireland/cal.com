import type { loadAndValidateUsers } from "./loadAndValidateUsers";

type Users = Awaited<ReturnType<typeof loadAndValidateUsers>>;

const sortUsersByDynamicList = (users: Users, dynamicUserList: string[]) => {
  return users.sort((a, b) => {
    const aIndex = (a.username && dynamicUserList.indexOf(a.username)) || 0;
    const bIndex = (b.username && dynamicUserList.indexOf(b.username)) || 0;
    return aIndex - bIndex;
  });
};

export const getLocationValuesForDb = (
  dynamicUserList: string[],
  users: Users,
  locationBodyString: string
) => {
  // TODO: It's definition should be moved to getLocationValueForDb
  if (dynamicUserList.length > 1) {
    users = sortUsersByDynamicList(users, dynamicUserList);
    locationBodyString = locationBodyString;
  }
  return { locationBodyString };
};
