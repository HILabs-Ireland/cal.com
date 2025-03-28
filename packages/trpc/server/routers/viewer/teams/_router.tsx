import authedProcedure from "../../../procedures/authedProcedure";
import { importHandler, router } from "../../../trpc";
import { ZAcceptOrLeaveInputSchema } from "./acceptOrLeave.schema";
import { ZAddMembersToEventTypes } from "./addMembersToEventTypes.schema";
import { ZChangeMemberRoleInputSchema } from "./changeMemberRole.schema";
import { ZCheckIfMembershipExistsInputSchema } from "./checkIfMembershipExists.schema";
import { ZCreateInputSchema } from "./create.schema";
import { ZCreateInviteInputSchema } from "./createInvite.schema";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZDeleteInviteInputSchema } from "./deleteInvite.schema";
import { ZGetSchema } from "./get.schema";
import { ZGetMemberAvailabilityInputSchema } from "./getMemberAvailability.schema";
import { ZGetMembershipbyUserInputSchema } from "./getMembershipbyUser.schema";
import { ZGetUserConnectedAppsInputSchema } from "./getUserConnectedApps.schema";
import { ZHasActiveTeamPlanSchema } from "./hasActiveTeamPlan.schema";
import { ZHasEditPermissionForUserSchema } from "./hasEditPermissionForUser.schema";
import { ZInviteMemberInputSchema } from "./inviteMember/inviteMember.schema";
import { ZInviteMemberByTokenSchemaInputSchema } from "./inviteMemberByToken.schema";
import { ZLegacyListMembersInputSchema } from "./legacyListMembers.schema";
import { ZGetListSchema } from "./list.schema";
import { ZListMembersInputSchema } from "./listMembers.schema";
import { ZPublishInputSchema } from "./publish.schema";
import { ZRemoveHostsFromEventTypes } from "./removeHostsFromEventTypes.schema";
import { ZRemoveMemberInputSchema } from "./removeMember.schema";
import { ZResendInvitationInputSchema } from "./resendInvitation.schema";
import { ZGetRoundRobinHostsInputSchema } from "./roundRobin/getRoundRobinHostsToReasign.schema";
import { ZSetInviteExpirationInputSchema } from "./setInviteExpiration.schema";
import { ZUpdateInputSchema } from "./update.schema";
import { ZUpdateMembershipInputSchema } from "./updateMembership.schema";

const NAMESPACE = "teams";
const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const viewerTeamsRouter = router({
  // Retrieves team by id
  get: authedProcedure.input(ZGetSchema).query(async (opts) => {
    const handler = await importHandler(namespaced("get"), () => import("./get.handler"));
    return handler(opts);
  }),
  // Returns teams I a member of
  list: authedProcedure.input(ZGetListSchema).query(async (opts) => {
    const handler = await importHandler(namespaced("list"), () => import("./list.handler"));
    return handler(opts);
  }),
  // Returns Teams I am a owner/admin of
  listOwnedTeams: authedProcedure.query(async (opts) => {
    const handler = await importHandler(namespaced("list"), () => import("./list.handler"));
    return handler(opts);
  }),
  create: authedProcedure.input(ZCreateInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("create"), () => import("./create.handler"));
    return handler(opts);
  }),
  // Allows team owner to update team metadata
  update: authedProcedure.input(ZUpdateInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("update"), () => import("./update.handler"));
    return handler(opts);
  }),
  delete: authedProcedure.input(ZDeleteInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("delete"), () => import("./delete.handler"));
    return handler(opts);
  }),
  removeMember: authedProcedure.input(ZRemoveMemberInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("removeMember"), () => import("./removeMember.handler"));
    return handler(opts);
  }),
  inviteMember: authedProcedure.input(ZInviteMemberInputSchema).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("inviteMember"),
      () => import("./inviteMember/inviteMember.handler")
    );
    return handler(opts);
  }),
  acceptOrLeave: authedProcedure.input(ZAcceptOrLeaveInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("acceptOrLeave"), () => import("./acceptOrLeave.handler"));
    return handler(opts);
  }),
  changeMemberRole: authedProcedure.input(ZChangeMemberRoleInputSchema).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("changeMemberRole"),
      () => import("./changeMemberRole.handler")
    );
    return handler(opts);
  }),
  getMemberAvailability: authedProcedure.input(ZGetMemberAvailabilityInputSchema).query(async (opts) => {
    const handler = await importHandler(
      namespaced("getMemberAvailability"),
      () => import("./getMemberAvailability.handler")
    );
    return handler(opts);
  }),
  getMembershipbyUser: authedProcedure.input(ZGetMembershipbyUserInputSchema).query(async (opts) => {
    const handler = await importHandler(
      namespaced("getMembershipbyUser"),
      () => import("./getMembershipbyUser.handler")
    );
    return handler(opts);
  }),
  updateMembership: authedProcedure.input(ZUpdateMembershipInputSchema).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("updateMembership"),
      () => import("./updateMembership.handler")
    );
    return handler(opts);
  }),
  publish: authedProcedure.input(ZPublishInputSchema).mutation(async (opts) => {
    return {
      url: "null",
      message: "This endpoint is deprecated",
    };
  }),
  listMembers: authedProcedure.input(ZListMembersInputSchema).query(async (opts) => {
    const handler = await importHandler(namespaced("listMembers"), () => import("./listMembers.handler"));
    return handler(opts);
  }),
  legacyListMembers: authedProcedure.input(ZLegacyListMembersInputSchema).query(async (opts) => {
    const handler = await importHandler(
      namespaced("legacyListMembers"),
      () => import("./legacyListMembers.handler")
    );
    return handler(opts);
  }),
  getUserConnectedApps: authedProcedure.input(ZGetUserConnectedAppsInputSchema).query(async (opts) => {
    const handler = await importHandler(
      namespaced("getUserConnectedApps"),
      () => import("./getUserConnectedApps.handler")
    );
    return handler(opts);
  }),
  createInvite: authedProcedure.input(ZCreateInviteInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("createInvite"), () => import("./createInvite.handler"));
    return handler(opts);
  }),
  setInviteExpiration: authedProcedure.input(ZSetInviteExpirationInputSchema).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("setInviteExpiration"),
      () => import("./setInviteExpiration.handler")
    );
    return handler(opts);
  }),
  deleteInvite: authedProcedure.input(ZDeleteInviteInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("deleteInvite"), () => import("./deleteInvite.handler"));
    return handler(opts);
  }),
  inviteMemberByToken: authedProcedure.input(ZInviteMemberByTokenSchemaInputSchema).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("inviteMemberByToken"),
      () => import("./inviteMemberByToken.handler")
    );
    return handler(opts);
  }),
  hasEditPermissionForUser: authedProcedure.input(ZHasEditPermissionForUserSchema).query(async (opts) => {
    const handler = await importHandler(
      namespaced("hasEditPermissionForUser"),
      () => import("./hasEditPermissionForUser.handler")
    );
    return handler(opts);
  }),
  resendInvitation: authedProcedure.input(ZResendInvitationInputSchema).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("resendInvitation"),
      () => import("./resendInvitation.handler")
    );
    return handler(opts);
  }),
  getRoundRobinHostsToReassign: authedProcedure.input(ZGetRoundRobinHostsInputSchema).query(async (opts) => {
    const handler = await importHandler(
      namespaced("getRoundRobinHostsToReassign"),
      () => import("./roundRobin/getRoundRobinHostsToReasign.handler")
    );
    return handler(opts);
  }),
  checkIfMembershipExists: authedProcedure
    .input(ZCheckIfMembershipExistsInputSchema)
    .mutation(async (opts) => {
      const handler = await importHandler(
        namespaced("checkIfMembershipExists"),
        () => import("./checkIfMembershipExists.handler")
      );
      return handler(opts);
    }),
  addMembersToEventTypes: authedProcedure.input(ZAddMembersToEventTypes).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("addMembersToEventTypes"),
      () => import("./addMembersToEventTypes.handler")
    );
    return handler(opts);
  }),
  removeHostsFromEventTypes: authedProcedure.input(ZRemoveHostsFromEventTypes).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("removeHostsFromEventTypes"),
      () => import("./removeHostsFromEventTypes.handler")
    );
    return handler(opts);
  }),
  hasActiveTeamPlan: authedProcedure.input(ZHasActiveTeamPlanSchema).query(async (opts) => {
    const handler = await importHandler(
      namespaced("hasActiveTeamPlan"),
      () => import("./hasActiveTeamPlan.handler")
    );
    return handler(opts);
  }),
});
