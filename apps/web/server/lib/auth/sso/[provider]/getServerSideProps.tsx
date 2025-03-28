/* eslint-disable turbo/no-undeclared-env-vars */
import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { asStringOrNull } from "@lib/asStringOrNull";

import { ssrInit } from "@server/lib/ssr";

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  // get query params and typecast them to string
  // (would be even better to assert them instead of typecasting)
  const providerParam = asStringOrNull(context.query.provider);
  const usernameParam = asStringOrNull(context.query.username);
  const successDestination = `/getting-started${usernameParam ? `?username=${usernameParam}` : ""}`;
  if (!providerParam) {
    throw new Error(`File is not named sso/[provider]`);
  }

  const { req } = context;

  const session = await getServerSession({ req });
  const ssr = await ssrInit(context);

  if (session) {
    return {
      redirect: {
        destination: successDestination,
        permanent: false,
      },
    };
  }

  const error: string | null = null;

  if (error) {
    return {
      redirect: {
        destination: `/auth/error?error=${error}`,
        permanent: false,
      },
    };
  }

  return {
    props: {
      trpcState: ssr.dehydrate(),
      provider: providerParam,
      isSAMLLoginEnabled: false,
      hostedCal: false,
      tenant: "",
      product: "",
      error,
    },
  };
};
