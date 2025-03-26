"use client";

import { signIn } from "next-auth/react";
import Head from "next/head";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import z from "zod";

import { classNames } from "@calcom/lib";
import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Button, showToast } from "@calcom/ui";
import { Icon } from "@calcom/ui";

import type { getServerSideProps } from "@server/lib/auth/verify/getServerSideProps";

export type PageProps = inferSSRProps<typeof getServerSideProps>;

async function sendVerificationLogin(email: string, username: string) {
  await signIn("email", {
    email: email.toLowerCase(),
    username: username.toLowerCase(),
    redirect: false,
    callbackUrl: WEBAPP_URL || "https://app.cal.com",
  })
    .then(() => {
      showToast("Verification email sent", "success");
    })
    .catch((err) => {
      showToast(err, "error");
    });
}

function useSendFirstVerificationLogin({
  email,
  username,
}: {
  email: string | undefined;
  username: string | undefined;
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (!email || !username || sent.current) {
      return;
    }
    (async () => {
      await sendVerificationLogin(email, username);
      sent.current = true;
    })();
  }, [email, username]);
}

const querySchema = z.object({
  sessionId: z.string().optional(),
  t: z.string().optional(),
});

const MailOpenIcon = () => (
  <div className="bg-default rounded-full p-3">
    <Icon name="mail-open" className="text-emphasis h-12 w-12 flex-shrink-0 p-0.5 font-extralight" />
  </div>
);

export default function Verify(props: PageProps) {
  const searchParams = useCompatSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const routerQuery = useRouterQuery();
  const { t } = querySchema.parse(routerQuery);
  const [secondsLeft, setSecondsLeft] = useState(30);

  // @note: check for t=timestamp and apply disabled state and secondsLeft accordingly
  // to avoid refresh to skip waiting 30 seconds to re-send email
  useEffect(() => {
    const lastSent = new Date(parseInt(`${t}`));
    // @note: This double round() looks ugly but it's the only way I came up to get the time difference in seconds
    const difference = Math.round(Math.round(new Date().getTime() - lastSent.getTime()) / 1000);
    if (difference < 30) {
      // If less than 30 seconds, set the seconds left to 30 - difference
      setSecondsLeft(30 - difference);
    } else {
      // else set the seconds left to 0 and disabled false
      setSecondsLeft(0);
    }
  }, [t]);
  // @note: here we make sure each second is decremented if disabled up to 0.
  useEffect(() => {
    if (secondsLeft > 0) {
      const interval = setInterval(() => {
        if (secondsLeft > 0) {
          setSecondsLeft(secondsLeft - 1);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [secondsLeft]);

  return (
    <div className="text-default bg-muted bg-opacity-90 backdrop-blur-md backdrop-grayscale backdrop-filter">
      <Head>
        <title>Verify your email | {APP_NAME}</title>
      </Head>
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="border-subtle bg-default m-10 flex max-w-2xl flex-col items-center rounded-xl border px-8 py-14 text-left">
          <MailOpenIcon />
          <h3 className="font-cal text-emphasis my-6 text-2xl font-normal leading-none">Check your Inbox</h3>

          <div className="mt-7">
            <Button
              color="secondary"
              href={
                props.EMAIL_FROM
                  ? encodeURIComponent(`https://mail.google.com/mail/u/0/#search/from:${props.EMAIL_FROM}`)
                  : "https://mail.google.com/mail/u/0/"
              }
              target="_blank"
              EndIcon="external-link">
              Open in Gmail
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-subtle text-base font-normal ">Don’t seen an email?</p>
          <button
            className={classNames(
              "font-light",
              secondsLeft > 0 ? "text-muted" : "underline underline-offset-2 hover:font-normal"
            )}
            disabled={secondsLeft > 0}
            onClick={async (e) => {
              e.preventDefault();
              setSecondsLeft(30);
              // Update query params with t:timestamp, shallow: true doesn't re-render the page
              const _searchParams = new URLSearchParams(searchParams?.toString());
              _searchParams.set("t", `${Date.now()}`);
              router.replace(`${pathname}?${_searchParams.toString()}`);
              // return await sendVerificationLogin(customer.email, customer.username); TODO: Reimpliment customer now that stripe is removed
            }}>
            {secondsLeft > 0 ? `Resend in ${secondsLeft} seconds` : "Resend"}
          </button>
        </div>
      </div>
    </div>
  );
}
