import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";
import { UserPermissionRole } from "@calcom/prisma/enums";

import { ssrInit } from "@server/lib/ssr";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { req } = context;

  const ssr = await ssrInit(context);
  const userCount = await prisma.user.count();

  const session = await getServerSession({ req });

  if (session?.user.role && session?.user.role !== UserPermissionRole.ADMIN) {
    return {
      redirect: {
        destination: `/404`,
        permanent: false,
      },
    };
  }

  const isFreeLicense = true; // (await getDeploymentKey(prisma)) === "";

  return {
    props: {
      trpcState: ssr.dehydrate(),
      isFreeLicense,
      userCount,
    },
  };
}
