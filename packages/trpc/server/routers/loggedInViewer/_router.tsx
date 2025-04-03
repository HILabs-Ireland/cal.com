import authedProcedure from "../../procedures/authedProcedure";
import { importHandler, router } from "../../trpc";
import { ZAddSecondaryEmailInputSchema } from "./addSecondaryEmail.schema";
import { ZConnectAndJoinInputSchema } from "./connectAndJoin.schema";
import { ZDeleteMeInputSchema } from "./deleteMe.schema";
import { ZEventTypeOrderInputSchema } from "./eventTypeOrder.schema";
import { ZIntegrationsInputSchema } from "./integrations.schema";
import { ZLocationOptionsInputSchema } from "./locationOptions.schema";
import { ZNoShowInputSchema } from "./markNoShow.schema";
import { me } from "./procedures/me";
import { myStats } from "./procedures/myStats";
import { platformMe } from "./procedures/platformMe";
import { teamsAndUserProfilesQuery } from "./procedures/teamsAndUserProfilesQuery";
import { ZRemoveNotificationsSubscriptionInputSchema } from "./removeNotificationsSubscription.schema";
import { ZRoutingFormOrderInputSchema } from "./routingFormOrder.schema";
import { ZSubmitFeedbackInputSchema } from "./submitFeedback.schema";
import { ZUpdateProfileInputSchema } from "./updateProfile.schema";
import { ZWorkflowOrderInputSchema } from "./workflowOrder.schema";

const NAMESPACE = "loggedInViewer";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

type AppsRouterHandlerCache = {
  me?: typeof import("./me.handler").meHandler;
  myStats?: typeof import("./myStats.handler").myStatsHandler;
  platformMe?: typeof import("./platformMe.handler").platformMeHandler;
  shouldVerifyEmail?: typeof import("./shouldVerifyEmail.handler").shouldVerifyEmailHandler;
  deleteMe?: typeof import("./deleteMe.handler").deleteMeHandler;
  deleteMeWithoutPassword?: typeof import("./deleteMeWithoutPassword.handler").deleteMeWithoutPasswordHandler;
  integrations?: typeof import("./integrations.handler").integrationsHandler;
  updateProfile?: typeof import("./updateProfile.handler").updateProfileHandler;
  eventTypeOrder?: typeof import("./eventTypeOrder.handler").eventTypeOrderHandler;
  routingFormOrder?: typeof import("./routingFormOrder.handler").routingFormOrderHandler;
  workflowOrder?: typeof import("./workflowOrder.handler").workflowOrderHandler;
  submitFeedback?: typeof import("./submitFeedback.handler").submitFeedbackHandler;
  locationOptions?: typeof import("./locationOptions.handler").locationOptionsHandler;
  bookingUnconfirmedCount?: typeof import("./bookingUnconfirmedCount.handler").bookingUnconfirmedCountHandler;
  teamsAndUserProfilesQuery?: typeof import("./teamsAndUserProfilesQuery.handler").teamsAndUserProfilesQuery;
  getUserTopBanners?: typeof import("./getUserTopBanners.handler").getUserTopBannersHandler;
  connectAndJoin?: typeof import("./connectAndJoin.handler").Handler;
  addSecondaryEmail?: typeof import("./addSecondaryEmail.handler").addSecondaryEmailHandler;
  getTravelSchedules?: typeof import("./getTravelSchedules.handler").getTravelSchedulesHandler;
  outOfOfficeReasonList?: typeof import("./outOfOfficeReasons.handler").outOfOfficeReasonList;
  removeNotificationsSubscription?: typeof import("./removeNotificationsSubscription.handler").removeNotificationsSubscriptionHandler;
  markNoShow?: typeof import("./markNoShow.handler").markNoShow;
};

const UNSTABLE_HANDLER_CACHE: AppsRouterHandlerCache = {};

export const loggedInViewerRouter = router({
  me,
  myStats,
  platformMe,

  deleteMe: authedProcedure.input(ZDeleteMeInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.deleteMe) {
      UNSTABLE_HANDLER_CACHE.deleteMe = (await import("./deleteMe.handler")).deleteMeHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.deleteMe) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.deleteMe({ ctx, input });
  }),

  deleteMeWithoutPassword: authedProcedure.mutation(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.deleteMeWithoutPassword) {
      UNSTABLE_HANDLER_CACHE.deleteMeWithoutPassword = (
        await import("./deleteMeWithoutPassword.handler")
      ).deleteMeWithoutPasswordHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.deleteMeWithoutPassword) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.deleteMeWithoutPassword({ ctx });
  }),

  integrations: authedProcedure.input(ZIntegrationsInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.integrations) {
      UNSTABLE_HANDLER_CACHE.integrations = (await import("./integrations.handler")).integrationsHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.integrations) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.integrations({ ctx, input });
  }),

  updateProfile: authedProcedure.input(ZUpdateProfileInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.updateProfile) {
      UNSTABLE_HANDLER_CACHE.updateProfile = (await import("./updateProfile.handler")).updateProfileHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.updateProfile) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.updateProfile({ ctx, input });
  }),

  unlinkConnectedAccount: authedProcedure.mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("unlinkConnectedAccount"),
      () => import("./unlinkConnectedAccount.handler")
    );
    return handler(opts);
  }),

  eventTypeOrder: authedProcedure.input(ZEventTypeOrderInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.eventTypeOrder) {
      UNSTABLE_HANDLER_CACHE.eventTypeOrder = (
        await import("./eventTypeOrder.handler")
      ).eventTypeOrderHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.eventTypeOrder) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.eventTypeOrder({ ctx, input });
  }),

  routingFormOrder: authedProcedure.input(ZRoutingFormOrderInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.routingFormOrder) {
      UNSTABLE_HANDLER_CACHE.routingFormOrder = (
        await import("./routingFormOrder.handler")
      ).routingFormOrderHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.routingFormOrder) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.routingFormOrder({ ctx, input });
  }),

  workflowOrder: authedProcedure.input(ZWorkflowOrderInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.workflowOrder) {
      UNSTABLE_HANDLER_CACHE.workflowOrder = (await import("./workflowOrder.handler")).workflowOrderHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.workflowOrder) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.workflowOrder({ ctx, input });
  }),

  //Comment for PR: eventTypePosition is not used anywhere
  submitFeedback: authedProcedure.input(ZSubmitFeedbackInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.submitFeedback) {
      UNSTABLE_HANDLER_CACHE.submitFeedback = (
        await import("./submitFeedback.handler")
      ).submitFeedbackHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.submitFeedback) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.submitFeedback({ ctx, input });
  }),

  locationOptions: authedProcedure.input(ZLocationOptionsInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.locationOptions) {
      UNSTABLE_HANDLER_CACHE.locationOptions = (
        await import("./locationOptions.handler")
      ).locationOptionsHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.locationOptions) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.locationOptions({ ctx, input });
  }),

  bookingUnconfirmedCount: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.bookingUnconfirmedCount) {
      UNSTABLE_HANDLER_CACHE.bookingUnconfirmedCount = (
        await import("./bookingUnconfirmedCount.handler")
      ).bookingUnconfirmedCountHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.bookingUnconfirmedCount) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.bookingUnconfirmedCount({ ctx });
  }),

  getUserTopBanners: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.getUserTopBanners) {
      UNSTABLE_HANDLER_CACHE.getUserTopBanners = (
        await import("./getUserTopBanners.handler")
      ).getUserTopBannersHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.getUserTopBanners) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.getUserTopBanners({ ctx });
  }),

  shouldVerifyEmail: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.shouldVerifyEmail) {
      UNSTABLE_HANDLER_CACHE.shouldVerifyEmail = (
        await import("./shouldVerifyEmail.handler")
      ).shouldVerifyEmailHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.shouldVerifyEmail) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.shouldVerifyEmail({ ctx });
  }),
  teamsAndUserProfilesQuery,
  connectAndJoin: authedProcedure.input(ZConnectAndJoinInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.connectAndJoin) {
      UNSTABLE_HANDLER_CACHE.connectAndJoin = (await import("./connectAndJoin.handler")).Handler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.connectAndJoin) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.connectAndJoin({ ctx, input });
  }),
  addSecondaryEmail: authedProcedure.input(ZAddSecondaryEmailInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.addSecondaryEmail) {
      UNSTABLE_HANDLER_CACHE.addSecondaryEmail = (
        await import("./addSecondaryEmail.handler")
      ).addSecondaryEmailHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.addSecondaryEmail) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.addSecondaryEmail({ ctx, input });
  }),
  getTravelSchedules: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.getTravelSchedules) {
      UNSTABLE_HANDLER_CACHE.getTravelSchedules = (
        await import("./getTravelSchedules.handler")
      ).getTravelSchedulesHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.getTravelSchedules) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.getTravelSchedules({ ctx });
  }),
  outOfOfficeReasonList: authedProcedure.query(async () => {
    if (!UNSTABLE_HANDLER_CACHE.outOfOfficeReasonList) {
      UNSTABLE_HANDLER_CACHE.outOfOfficeReasonList = (
        await import("./outOfOfficeReasons.handler")
      ).outOfOfficeReasonList;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.outOfOfficeReasonList) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.outOfOfficeReasonList();
  }),

  removeNotificationsSubscription: authedProcedure
    .input(ZRemoveNotificationsSubscriptionInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.removeNotificationsSubscription) {
        UNSTABLE_HANDLER_CACHE.removeNotificationsSubscription = (
          await import("./removeNotificationsSubscription.handler")
        ).removeNotificationsSubscriptionHandler;
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.removeNotificationsSubscription) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.removeNotificationsSubscription({ ctx, input });
    }),
  markNoShow: authedProcedure.input(ZNoShowInputSchema).mutation(async (opts) => {
    if (!UNSTABLE_HANDLER_CACHE.markNoShow) {
      UNSTABLE_HANDLER_CACHE.markNoShow = (await import("./markNoShow.handler")).markNoShow;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.markNoShow) {
      throw new Error("Failed to load handler");
    }
    return UNSTABLE_HANDLER_CACHE.markNoShow(opts);
  }),
});
