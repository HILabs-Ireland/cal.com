import authedProcedure, { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { checkGlobalKeysSchema } from "./checkGlobalKeys.schema";
import { ZListLocalInputSchema } from "./listLocal.schema";
import { ZQueryForDependenciesInputSchema } from "./queryForDependencies.schema";
import { ZSaveKeysInputSchema } from "./saveKeys.schema";
import { ZSetDefaultConferencingAppSchema } from "./setDefaultConferencingApp.schema";
import { ZToggleInputSchema } from "./toggle.schema";

type AppsRouterHandlerCache = {
  listLocal?: typeof import("./listLocal.handler").listLocalHandler;
  toggle?: typeof import("./toggle.handler").toggleHandler;
  saveKeys?: typeof import("./saveKeys.handler").saveKeysHandler;
  checkForGCal?: typeof import("./checkForGCal.handler").checkForGCalHandler;
  queryForDependencies?: typeof import("./queryForDependencies.handler").queryForDependenciesHandler;
  checkGlobalKeys?: typeof import("./checkGlobalKeys.handler").checkForGlobalKeysHandler;
  setDefaultConferencingApp?: typeof import("./setDefaultConferencingApp.handler").setDefaultConferencingAppHandler;
};

const UNSTABLE_HANDLER_CACHE: AppsRouterHandlerCache = {};

export const appsRouter = router({
  listLocal: authedAdminProcedure.input(ZListLocalInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.listLocal) {
      UNSTABLE_HANDLER_CACHE.listLocal = await import("./listLocal.handler").then(
        (mod) => mod.listLocalHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.listLocal) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.listLocal({
      ctx,
      input,
    });
  }),

  toggle: authedAdminProcedure.input(ZToggleInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.toggle) {
      UNSTABLE_HANDLER_CACHE.toggle = await import("./toggle.handler").then((mod) => mod.toggleHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.toggle) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.toggle({
      ctx,
      input,
    });
  }),

  saveKeys: authedAdminProcedure.input(ZSaveKeysInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.saveKeys) {
      UNSTABLE_HANDLER_CACHE.saveKeys = await import("./saveKeys.handler").then((mod) => mod.saveKeysHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.saveKeys) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.saveKeys({
      ctx,
      input,
    });
  }),

  checkForGCal: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.checkForGCal) {
      UNSTABLE_HANDLER_CACHE.checkForGCal = await import("./checkForGCal.handler").then(
        (mod) => mod.checkForGCalHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.checkForGCal) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.checkForGCal({
      ctx,
    });
  }),

  setDefaultConferencingApp: authedProcedure
    .input(ZSetDefaultConferencingAppSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.setDefaultConferencingApp) {
        UNSTABLE_HANDLER_CACHE.setDefaultConferencingApp = await import(
          "./setDefaultConferencingApp.handler"
        ).then((mod) => mod.setDefaultConferencingAppHandler);
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.setDefaultConferencingApp) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.setDefaultConferencingApp({
        ctx,
        input,
      });
    }),
  queryForDependencies: authedProcedure
    .input(ZQueryForDependenciesInputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.queryForDependencies) {
        UNSTABLE_HANDLER_CACHE.queryForDependencies = await import("./queryForDependencies.handler").then(
          (mod) => mod.queryForDependenciesHandler
        );
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.queryForDependencies) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.queryForDependencies({
        ctx,
        input,
      });
    }),
  checkGlobalKeys: authedProcedure.input(checkGlobalKeysSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.checkGlobalKeys) {
      UNSTABLE_HANDLER_CACHE.checkGlobalKeys = await import("./checkGlobalKeys.handler").then(
        (mod) => mod.checkForGlobalKeysHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.checkGlobalKeys) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.checkGlobalKeys({
      ctx,
      input,
    });
  }),
});
