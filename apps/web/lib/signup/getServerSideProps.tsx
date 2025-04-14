import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { getFeatureFlag } from "@calcom/features/flags/server/utils";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { emailSchema } from "@calcom/lib/emailSchema";
import slugify from "@calcom/lib/slugify";

import { IS_GOOGLE_LOGIN_ENABLED } from "@server/lib/constants";
import { ssrInit } from "@server/lib/ssr";

const querySchema = z.object({
  username: z
    .string()
    .optional()
    .transform((val) => val || ""),
  email: emailSchema.optional(),
});

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const emailVerificationEnabled = await getFeatureFlag(prisma, "email-verification");
  await ssrInit(ctx);
  const signupDisabled = await getFeatureFlag(prisma, "disable-signup");

  const token = z.string().optional().parse(ctx.query.token);
  const redirectUrlData = z
    .string()
    .refine((value) => value.startsWith(WEBAPP_URL), {
      params: (value: string) => ({ value }),
      message: "Redirect URL must start with 'cal.com'",
    })
    .optional()
    .safeParse(ctx.query.redirect);

  const redirectUrl = redirectUrlData.success && redirectUrlData.data ? redirectUrlData.data : null;

  const props = {
    redirectUrl,
    isGoogleLoginEnabled: IS_GOOGLE_LOGIN_ENABLED,
    prepopulateFormValues: undefined,
    emailVerificationEnabled,
  };

  const { username: preFillusername, email: prefilEmail } = querySchema.parse(ctx.query);

  if ((process.env.NEXT_PUBLIC_DISABLE_SIGNUP === "true" && !token) || signupDisabled) {
    return {
      redirect: {
        permanent: false,
        destination: `/auth/error?error=Signup is disabled in this instance`,
      },
    } as const;
  }

  if (!token) {
    return {
      props: JSON.parse(
        JSON.stringify({
          ...props,
          prepopulateFormValues: {
            username: preFillusername || null,
            email: prefilEmail || null,
          },
        })
      ),
    };
  }

  const verificationToken = await prisma.verificationToken.findUnique({
    where: {
      token,
    },
    include: {
      team: {
        select: {
          metadata: true,
          parentId: true,
          slug: true,
        },
      },
    },
  });

  if (!verificationToken || verificationToken.expires < new Date()) {
    return {
      redirect: {
        permanent: false,
        destination: `/auth/error?error=Verification Token is missing or has expired`,
      },
    } as const;
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      AND: [
        {
          email: verificationToken?.identifier,
        },
        {
          emailVerified: {
            not: null,
          },
        },
      ],
    },
  });

  if (existingUser) {
    return {
      redirect: {
        permanent: false,
        destination: `/auth/login?callbackUrl=${WEBAPP_URL}/${ctx.query.callbackUrl}`,
      },
    };
  }

  const guessUsernameFromEmail = (email: string) => {
    const [username] = email.split("@");
    return username;
  };

  const username = guessUsernameFromEmail(verificationToken.identifier);

  return {
    props: {
      ...props,
      token,
      prepopulateFormValues: {
        email: verificationToken.identifier,
        username: slugify(username),
      },
    },
  };
};
