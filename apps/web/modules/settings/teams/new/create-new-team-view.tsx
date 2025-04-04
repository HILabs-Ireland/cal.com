"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { z } from "zod";

import { CreateANewTeamForm } from "@calcom/features/ee/teams/components";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import type { RouterOutputs } from "@calcom/trpc/react";
import { WizardLayout } from "@calcom/ui";

const querySchema = z.object({
  returnTo: z.string().optional(),
  slug: z.string().optional(),
});

const CreateNewTeamPage = () => {
  const params = useParamsWithFallback();
  const parsedQuery = querySchema.safeParse(params);
  const router = useRouter();
  const telemetry = useTelemetry();

  const flag = {
    telemetryEvent: telemetryEventTypes.team_created,
    submitLabel: "continue",
  };

  const returnToParam =
    (parsedQuery.success ? getSafeRedirectUrl(parsedQuery.data.returnTo) : "/teams") || "/teams";

  const onSuccess = (data: RouterOutputs["viewer"]["teams"]["create"]) => {
    telemetry.event(flag.telemetryEvent);
    router.push(data.url);
  };

  return (
    <CreateANewTeamForm
      slug={parsedQuery.success ? parsedQuery.data.slug : ""}
      onCancel={() => router.push(returnToParam)}
      submitLabel={flag.submitLabel}
      onSuccess={onSuccess}
    />
  );
};
export const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={1} maxSteps={3}>
      {page}
    </WizardLayout>
  );
};

export default CreateNewTeamPage;
