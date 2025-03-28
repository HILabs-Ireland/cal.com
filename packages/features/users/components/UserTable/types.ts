import type { MembershipRole } from "@calcom/prisma/enums";

export interface UserTableUser {
  id: number;
  username: string | null;
  email: string;
  timeZone: string;
  role: MembershipRole;
  avatarUrl: string | null;
  accepted: boolean;
  disableImpersonation: boolean;
  completedOnboarding: boolean;
  lastActiveAt: string;
  teams: {
    id: number;
    name: string;
    slug: string | null;
  }[];
  attributes: {
    id: string;
    attributeId: string;
    value: string;
    slug: string;
    weight?: number | null;
    contains: string[];
  }[];
}

export type PlatformManagedUserTableUser = Omit<
  UserTableUser,
  "lastActiveAt" | "attributes" | "completedOnboarding" | "disableImpersonation"
>;

export type UserTablePayload = {
  showModal: boolean;
  user?: UserTableUser;
};

export type PlatformUserTablePayload = {
  showModal: boolean;
  user?: PlatformManagedUserTableUser;
};

export type UserTableState = {
  changeMemberRole: UserTablePayload;
  deleteMember: UserTablePayload;
  inviteMember: UserTablePayload;
  editSheet: UserTablePayload & { user?: UserTableUser };
};

export type PlatforManagedUserTableState = {
  deleteMember: UserTablePayload;
};

export type UserTableAction =
  | {
      type:
        | "SET_CHANGE_MEMBER_ROLE_ID"
        | "SET_DELETE_ID"
        | "INVITE_MEMBER"
        | "EDIT_USER_SHEET"
        | "INVITE_MEMBER";
      payload: UserTablePayload;
    }
  | {
      type: "CLOSE_MODAL";
    };

export type PlatformManagedUserTableAction =
  | {
      type: "SET_DELETE_ID";
      payload: PlatformUserTablePayload;
    }
  | {
      type: "CLOSE_MODAL";
    };
