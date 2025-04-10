"use client";

import type { AppRouter } from "@calcom/trpc/server/routers/_app";

import { createTRPCReact } from "@trpc/react-query";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockedTrpc: any = createTRPCReact<AppRouter>();
