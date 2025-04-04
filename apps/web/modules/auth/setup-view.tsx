"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { WizardForm } from "@calcom/ui";

import { AdminUserContainer as AdminUser } from "@components/setup/AdminUser";
import ChooseLicense from "@components/setup/ChooseLicense";
import EnterpriseLicense from "@components/setup/EnterpriseLicense";

import type { getServerSideProps } from "@server/lib/setup/getServerSideProps";

function useSetStep() {
  const router = useRouter();
  const searchParams = useCompatSearchParams();
  const pathname = usePathname();
  const setStep = (newStep = 1) => {
    const _searchParams = new URLSearchParams(searchParams ?? undefined);
    _searchParams.set("step", newStep.toString());
    router.replace(`${pathname}?${_searchParams.toString()}`);
  };
  return setStep;
}

export type PageProps = inferSSRProps<typeof getServerSideProps>;
export function Setup(props: PageProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [value, setValue] = useState(props.isFreeLicense ? "FREE" : "EE");
  const isFreeLicense = value === "FREE";
  const [isEnabledEE, setIsEnabledEE] = useState(!props.isFreeLicense);
  const setStep = useSetStep();

  const steps: React.ComponentProps<typeof WizardForm>["steps"] = [
    {
      title: t("administrator_user"),
      description: t("lets_create_first_administrator_user"),
      content: (setIsPending) => (
        <AdminUser
          onSubmit={() => {
            setIsPending(true);
          }}
          onSuccess={() => {
            setStep(2);
          }}
          onError={() => {
            setIsPending(false);
          }}
          userCount={props.userCount}
        />
      ),
    },
    {
      title: t("choose_a_license"),
      description: t("choose_license_description"),
      content: (setIsPending) => {
        return (
          <ChooseLicense
            id="wizard-step-2"
            name="wizard-step-2"
            value={value}
            onChange={setValue}
            onSubmit={() => {
              setIsPending(true);
              setStep(3);
            }}
          />
        );
      },
    },
  ];

  if (!isFreeLicense) {
    steps.push({
      title: t("step_enterprise_license"),
      description: t("step_enterprise_license_description"),
      content: (setIsPending) => {
        const currentStep = 3;
        return (
          <EnterpriseLicense
            id={`wizard-step-${currentStep}`}
            name={`wizard-step-${currentStep}`}
            onSubmit={() => {
              setIsPending(true);
            }}
            onSuccess={() => {
              setStep(currentStep + 1);
            }}
            onSuccessValidate={() => {
              setIsEnabledEE(true);
            }}
          />
        );
      },
      isEnabled: isEnabledEE,
    });
  }

  return (
    <main className="bg-subtle flex items-center print:h-full md:h-screen">
      <WizardForm
        href="/auth/setup"
        steps={steps}
        nextLabel={t("next_step_text")}
        finishLabel={t("finish")}
        prevLabel={t("prev_step")}
        stepLabel={(currentStep, maxSteps) => t("current_step_of_total", { currentStep, maxSteps })}
      />
    </main>
  );
}

Setup.isThemeSupported = false;

export default Setup;
