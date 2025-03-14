"use client";

import type { SessionContextValue } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import type { Ensure } from "@calcom/types/utils";
import { showToast } from "@calcom/ui";
import { Alert, Button, Form, TextField } from "@calcom/ui";

import { UserPermissionRole } from "../../../../prisma/enums";

export const CreateANewLicenseKeyForm = () => {
  const session = useSession();
  if (session.data?.user.role !== "ADMIN") {
    return null;
  }
  // @ts-expect-error session can't be null due to the early return
  return <CreateANewLicenseKeyFormChild session={session} />;
};

interface FormValues {
  entityCount: number;
  entityPrice: number;
  overages: number;
  email: string;
}

const CreateANewLicenseKeyFormChild = ({ session }: { session: Ensure<SessionContextValue, "data"> }) => {
  const { t } = useLocale();
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);
  const [stripeCheckoutUrl, setStripeCheckoutUrl] = useState<string | null>(null);
  const isAdmin = session.data.user.role === UserPermissionRole.ADMIN;
  const newLicenseKeyFormMethods = useForm<FormValues>({
    defaultValues: {
      entityCount: 500,
      overages: 99, // $0.99
      entityPrice: 50, // $0.5
      email: undefined,
    },
  });

  const mutation = trpc.viewer.admin.createSelfHostedLicense.useMutation({
    onSuccess: async (values) => {
      showToast(`Success: We have created a liscence key URL for this email`, "success");
      setStripeCheckoutUrl(values.stripeCheckoutUrl);
    },
    onError: async (err) => {
      setServerErrorMessage(err.message);
    },
  });

  return (
    <>
      {!stripeCheckoutUrl ? (
        <Form
          form={newLicenseKeyFormMethods}
          className="space-y-5"
          id="createOrg"
          handleSubmit={(values) => {
            mutation.mutate(values);
          }}>
          <div>
            {serverErrorMessage && (
              <div className="mb-5">
                <Alert severity="error" message={serverErrorMessage} />
              </div>
            )}

            <Controller
              name="email"
              control={newLicenseKeyFormMethods.control}
              rules={{
                required: t("must_enter_email"),
              }}
              render={({ field: { value, onChange } }) => (
                <div className="flex">
                  <TextField
                    containerClassName="w-full"
                    placeholder="john@acme.com"
                    name="Email"
                    disabled={!isAdmin}
                    label="Email for user"
                    defaultValue={value}
                    onChange={onChange}
                    autoComplete="off"
                  />
                </div>
              )}
            />
          </div>

          <div className="flex flex-wrap gap-2 [&>*]:flex-1">
            <Controller
              name="entityCount"
              control={newLicenseKeyFormMethods.control}
              rules={{
                required: "Must enter a total of billable users",
              }}
              render={({ field: { value, onChange } }) => (
                <TextField
                  className="mt-2"
                  name="entityCount"
                  label="Total entities included"
                  placeholder="100"
                  defaultValue={value}
                  onChange={(event) => onChange(+event.target.value)}
                />
              )}
            />
            <Controller
              name="entityPrice"
              control={newLicenseKeyFormMethods.control}
              rules={{
                required: "Must enter fixed price per user",
              }}
              render={({ field: { value, onChange } }) => (
                <TextField
                  className="mt-2"
                  name="entityPrice"
                  label="Fixed price per entity"
                  addOnSuffix="$"
                  defaultValue={value / 100}
                  onChange={(event) => onChange(+event.target.value * 100)}
                />
              )}
            />
          </div>

          <div>
            <Controller
              name="overages"
              control={newLicenseKeyFormMethods.control}
              rules={{
                required: "Must enter overages",
              }}
              render={({ field: { value, onChange } }) => (
                <>
                  <TextField
                    className="mt-2"
                    placeholder="Acme"
                    name="overages"
                    addOnSuffix="$"
                    label="Overages"
                    disabled={!isAdmin}
                    defaultValue={value / 100}
                    onChange={(event) => onChange(+event.target.value * 100)}
                    autoComplete="off"
                  />
                </>
              )}
            />
          </div>

          <div className="flex space-x-2 rtl:space-x-reverse">
            <Button
              disabled={newLicenseKeyFormMethods.formState.isSubmitting}
              color="primary"
              type="submit"
              form="createOrg"
              loading={mutation.isPending}
              className="w-full justify-center">
              {t("continue")} - Free
            </Button>
          </div>
        </Form>
      ) : (
        <div className="w-full">
          <div className="">
            <TextField className="flex-1" disabled value={stripeCheckoutUrl} />
          </div>

          <div className="mt-4 flex gap-2 [&>*]:flex-1 [&>*]:justify-center">
            <Button
              color="secondary"
              onClick={() => {
                newLicenseKeyFormMethods.reset();
                setStripeCheckoutUrl(null);
              }}>
              Back
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
