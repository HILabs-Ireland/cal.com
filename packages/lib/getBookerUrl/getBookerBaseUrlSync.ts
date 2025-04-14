import type { IncomingMessage } from "http";

import { ALLOWED_HOSTNAMES, RESERVED_SUBDOMAINS, WEBAPP_URL, WEBSITE_URL } from "@calcom/lib/constants";
import slugify from "@calcom/lib/slugify";
import type { Prisma } from "@calcom/prisma/client";

export function getOrgSlug(hostname: string, forcedSlug?: string): string | null {
  if (!hostname.includes(".")) {
    // A no-dot domain can never be an org domain. Automatically considers localhost to be non-org domain.
    return null;
  }

  const currentHostname = ALLOWED_HOSTNAMES.find((allowedHostname) => {
    const url = new URL(WEBAPP_URL);
    const testHostname = `${url.hostname}${url.port ? `:${url.port}` : ""}`;
    return testHostname.endsWith(`.${allowedHostname}`);
  });

  if (!currentHostname) {
    return null;
  }

  const slug = hostname.replace(`.${currentHostname}`, "");
  return slug.includes(".") ? null : slug;
}

export function orgDomainConfig(req?: IncomingMessage, fallback?: string | string[]) {
  const forcedSlug =
    req && req.headers && Array.isArray(req.headers["x-cal-force-slug"])
      ? req.headers["x-cal-force-slug"][0]
      : req?.headers?.["x-cal-force-slug"];

  if (isPlatformRequest(req) && forcedSlug) {
    return {
      isValidOrgDomain: true,
      currentOrgDomain: Array.isArray(forcedSlug) ? forcedSlug[0] : forcedSlug,
    };
  }

  const hostname = req?.headers?.host || "";
  return getOrgDomainConfigFromHostname({
    hostname,
    fallback,
    forcedSlug: Array.isArray(forcedSlug) ? forcedSlug[0] : forcedSlug,
  });
}

function isPlatformRequest(req?: IncomingMessage): boolean {
  return Boolean(req?.headers?.["x-cal-client-id"]);
}

export function getOrgDomainConfigFromHostname({
  hostname,
  fallback,
  forcedSlug,
}: {
  hostname: string;
  fallback?: string | string[];
  forcedSlug?: string;
}) {
  const currentOrgDomain = getOrgSlug(hostname, forcedSlug);
  const isValidOrgDomain =
    Boolean(currentOrgDomain) && currentOrgDomain !== null && !RESERVED_SUBDOMAINS.includes(currentOrgDomain);

  if (isValidOrgDomain || !fallback) {
    return {
      currentOrgDomain: isValidOrgDomain ? currentOrgDomain : null,
      isValidOrgDomain,
    };
  }

  const fallbackOrgSlug = Array.isArray(fallback) ? fallback[0] : fallback;
  const isValidFallbackDomain = Boolean(fallbackOrgSlug) && !RESERVED_SUBDOMAINS.includes(fallbackOrgSlug);

  return {
    currentOrgDomain: isValidFallbackDomain ? fallbackOrgSlug : null,
    isValidOrgDomain: isValidFallbackDomain,
  };
}

export function subdomainSuffix(): string {
  const urlSplit = WEBAPP_URL.replace(/https?:\/\//, "").split(".");
  return urlSplit.length === 3 ? urlSplit.slice(1).join(".") : urlSplit.join(".");
}

export function getOrgFullOrigin(
  slug: string | null,
  options: { protocol?: boolean } = { protocol: true }
): string {
  const baseUrl = WEBSITE_URL.replace(/https?:\/\//, "").replace(/http?:\/\//, "");
  if (!slug) {
    return options.protocol ? WEBSITE_URL : baseUrl;
  }

  const protocolPrefix = options.protocol ? `${new URL(WEBSITE_URL).protocol}//` : "";
  return `${protocolPrefix}${slug}.${subdomainSuffix()}`;
}

export function getSlugOrRequestedSlug(slug: string): Prisma.TeamWhereInput {
  const slugifiedValue = slugify(slug);
  return {
    OR: [
      { slug: slugifiedValue },
      {
        metadata: {
          path: ["requestedSlug"],
          equals: slugifiedValue,
        },
      },
    ],
  };
}

export const getBookerBaseUrlSync = (
  orgSlug: string | null,
  options?: {
    protocol: boolean;
  }
) => {
  return getOrgFullOrigin(orgSlug ?? "", options);
};
