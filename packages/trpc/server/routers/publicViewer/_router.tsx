import publicProcedure from "../../procedures/publicProcedure";
import { importHandler, router } from "../../trpc";
import { slotsRouter } from "../viewer/slots/_router";
import { ZUserEmailVerificationRequiredSchema } from "./checkIfUserEmailVerificationRequired.schema";
import { i18nInputSchema } from "./i18n.schema";
import { ZMarkHostAsNoShowInputSchema } from "./markHostAsNoShow.schema";
import { event } from "./procedures/event";
import { session } from "./procedures/session";
import { ZSubmitRatingInputSchema } from "./submitRating.schema";

const NAMESPACE = "publicViewer";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

// things that unauthenticated users can query about themselves
export const publicViewerRouter = router({
  session,
  i18n: publicProcedure.input(i18nInputSchema).query(async (opts) => {
    const handler = await importHandler(namespaced("i18n"), () => import("./i18n.handler"));
    return handler(opts);
  }),
  countryCode: publicProcedure.query(async (opts) => {
    const handler = await importHandler(namespaced("countryCode"), () => import("./countryCode.handler"));
    return handler(opts);
  }),
  submitRating: publicProcedure.input(ZSubmitRatingInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("submitRating"), () => import("./submitRating.handler"));
    return handler(opts);
  }),
  markHostAsNoShow: publicProcedure.input(ZMarkHostAsNoShowInputSchema).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("markHostAsNoShow"),
      () => import("./markHostAsNoShow.handler")
    );
    return handler(opts);
  }),
  slots: slotsRouter,
  event,
  checkIfUserEmailVerificationRequired: publicProcedure
    .input(ZUserEmailVerificationRequiredSchema)
    .query(async (opts) => {
      const handler = await importHandler(
        namespaced("checkIfUserEmailVerificationRequired"),
        () => import("./checkIfUserEmailVerificationRequired.handler")
      );
      return handler(opts);
    }),
});
