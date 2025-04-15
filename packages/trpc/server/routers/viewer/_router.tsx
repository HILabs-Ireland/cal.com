import { featureFlagRouter } from "@calcom/features/flags/server/router";

import { mergeRouters, router } from "../../trpc";
import { loggedInViewerRouter } from "../loggedInViewer/_router";
import { publicViewerRouter } from "../publicViewer/_router";
import { timezonesRouter } from "../publicViewer/timezones/_router";
import { adminRouter } from "./admin/_router";
import { apiKeysRouter } from "./apiKeys/_router";
import { attributesRouter } from "./attributes/_router";
import { authRouter } from "./auth/_router";
import { availabilityRouter } from "./availability/_router";
import { bookingsRouter } from "./bookings/_router";
import { domainWideDelegationRouter } from "./domainWideDelegation/_router";
import { eventTypesRouter } from "./eventTypes/_router";
import { highPerfRouter } from "./highPerf/_router";
import { oAuthRouter } from "./oAuth/_router";
import { slotsRouter } from "./slots/_router";
import { viewerTeamsRouter } from "./teams/_router";
import { webhookRouter } from "./webhook/_router";

export const viewerRouter = mergeRouters(
  loggedInViewerRouter,

  router({
    loggedInViewerRouter,
    public: publicViewerRouter,
    auth: authRouter,
    bookings: bookingsRouter,
    eventTypes: eventTypesRouter,
    availability: availabilityRouter,
    teams: viewerTeamsRouter,
    timezones: timezonesRouter,
    domainWideDelegation: domainWideDelegationRouter,
    webhook: webhookRouter,
    apiKeys: apiKeysRouter,
    slots: slotsRouter,
    // NOTE: Add all app related routes in the bottom till the problem described in @calcom/app-store/trpc-routers.ts is solved.
    // After that there would just one merge call here for all the apps.
    features: featureFlagRouter,
    oAuth: oAuthRouter,
    admin: adminRouter,
    attributes: attributesRouter,
    highPerf: highPerfRouter,
  })
);
