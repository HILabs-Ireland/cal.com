import { get } from "@vercel/edge-config";
import { collectEvents } from "next-collect/server";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getLocale } from "@calcom/features/auth/lib/getLocale";
import { extendEventData, nextCollectBasicSettings } from "@calcom/lib/telemetry";

import { csp } from "@lib/csp";

import { abTestMiddlewareFactory } from "./abTest/middlewareFactory";

const safeGet = async <T = any>(key: string): Promise<T | undefined> => {
  try {
    return get<T>(key);
  } catch (error) {
    // Don't crash if EDGE_CONFIG env var is missing
  }
};

const middleware = async (req: NextRequest): Promise<NextResponse<unknown>> => {
  const url = req.nextUrl;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-url", req.url);

  if (!url.pathname.startsWith("/api")) {
    //
    // NOTE: When tRPC hits an error a 500 is returned, when this is received
    //       by the application the user is automatically redirected to /auth/login.
    //
    //     - For this reason our matchers are sufficient for an app-wide maintenance page.
    //
    // Check whether the maintenance page should be shown
    const isInMaintenanceMode = await safeGet<boolean>("isInMaintenanceMode");
    // If is in maintenance mode, point the url pathname to the maintenance page
    if (isInMaintenanceMode) {
      req.nextUrl.pathname = `/maintenance`;
      return NextResponse.rewrite(req.nextUrl);
    }
  }

  if (url.pathname.startsWith("/api/trpc/")) {
    requestHeaders.set("x-cal-timezone", req.headers.get("x-vercel-ip-timezone") ?? "");
  }

  if (url.pathname.startsWith("/api/auth/signup")) {
    const isSignupDisabled = await safeGet<boolean>("isSignupDisabled");
    // If is in maintenance mode, point the url pathname to the maintenance page
    if (isSignupDisabled) {
      // TODO: Consider using responseWithHeaders here
      return NextResponse.json({ error: "Signup is disabled" }, { status: 503 });
    }
  }

  if (url.pathname.startsWith("/auth/login") || url.pathname.startsWith("/login")) {
    // Use this header to actually enforce CSP, otherwise it is running in Report Only mode on all pages.
    requestHeaders.set("x-csp-enforce", "true");
  }

  if (url.pathname.startsWith("/future/auth/logout")) {
    cookies().set("next-auth.session-token", "", {
      path: "/",
      expires: new Date(0),
    });
  }

  requestHeaders.set("x-pathname", url.pathname);

  const locale = await getLocale(req);

  requestHeaders.set("x-locale", locale);

  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return responseWithHeaders({ url, res, req });
};

const embeds = {
  addResponseHeaders: ({ url, res }: { url: URL; res: NextResponse }) => {
    if (!url.pathname.endsWith("/embed")) {
      return res;
    }
    const isCOEPEnabled = url.searchParams.get("flag.coep") === "true";
    if (isCOEPEnabled) {
      res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    }
    return res;
  },
};

const contentSecurityPolicy = {
  addResponseHeaders: ({ res, req }: { res: NextResponse; req: NextRequest }) => {
    const { nonce } = csp(req, res ?? null);

    if (!process.env.CSP_POLICY) {
      res.headers.set("x-csp", "not-opted-in");
    } else if (!res.headers.get("x-csp")) {
      // If x-csp not set by gSSP, then it's initialPropsOnly
      res.headers.set("x-csp", "initialPropsOnly");
    } else {
      res.headers.set("x-csp", nonce ?? "");
    }
    return res;
  },
};

function responseWithHeaders({ url, res, req }: { url: URL; res: NextResponse; req: NextRequest }) {
  const resWithCSP = contentSecurityPolicy.addResponseHeaders({ res, req });
  const resWithEmbeds = embeds.addResponseHeaders({ url, res: resWithCSP });
  return resWithEmbeds;
}

export const config = {
  // Next.js Doesn't support spread operator in config matcher, so, we must list all paths explicitly here.
  // https://github.com/vercel/next.js/discussions/42458
  matcher: [
    "/403",
    "/500",
    "/icons",
    "/d/:path*",
    "/more/:path*",
    "/maintenance/:path*",
    "/enterprise/:path*",
    "/connect-and-join/:path*",
    "/:path*/embed",
    "/api/auth/signup",
    "/api/trpc/:path*",
    "/login",
    "/auth/login",
    "/auth/error",

    "/event-types/:path*",

    "/workflows/:path*",
    "/getting-started/:path*",
    "/apps",
    "/bookings/:path*",
    "/video/:path*",
    "/teams/:path*",
    "/signup/:path*",
    "/settings/:path*",
    "/reschedule/:path*",
    "/availability/:path*",
    "/booking/:path*",
    "/team/:path*",
    "/org/[orgSlug]/[user]/[type]",
    "/org/[orgSlug]/team/[slug]/[type]",
    "/org/[orgSlug]/team/[slug]",
    "/org/[orgSlug]",
  ],
};

export default collectEvents({
  middleware: abTestMiddlewareFactory(middleware),
  ...nextCollectBasicSettings,
  cookieName: "__clnds",
  extend: extendEventData,
});
