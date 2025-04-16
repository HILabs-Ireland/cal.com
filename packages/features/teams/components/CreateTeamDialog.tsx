"use client";

import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { trpc } from "@calcom/trpc/react";
import { Alert, DialogFooter, Button, Form, TextField, Dialog, DialogContent } from "@calcom/ui";

export interface CreateTeamFormValues {
  name: string;
  slug: string;
  temporarySlug: string;
  logo: string;
}

interface RenderControlProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

interface CreateTeamDialogProps {
  children: (props: RenderControlProps) => React.ReactNode;
}

export const CreateTeamDialog = ({ children }: CreateTeamDialogProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {children({ open, setOpen })}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent type="creation">
          <CreateTeamForm onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};

const CreateTeamForm = ({ onClose }: { onClose: () => void }) => {
  const { t, isLocaleReady } = useLocale();

  const form = useForm<CreateTeamFormValues>();

  const {
    formState: { errors },
  } = form;

  const serverErrorMessage = errors.root?.serverError?.message;

  const createTeamMutation = trpc.viewer.teams.create.useMutation({
    onSuccess: onClose,
    onError: (err) => {
      if (err.message === "team_url_taken") {
        form.setError("slug", { type: "custom", message: t("url_taken") });
      } else {
        form.setError("root.serverError", { type: "custom", message: err.message });
      }
    },
  });

  return (
    <Form
      form={form}
      handleSubmit={(v) => {
        if (!createTeamMutation.isPending) {
          createTeamMutation.mutate(v);
        }
      }}>
      <div className="mb-8">
        {serverErrorMessage && (
          <div className="mb-4">
            <Alert severity="error" message={t(serverErrorMessage)} />
          </div>
        )}
        <Controller
          name="name"
          control={form.control}
          defaultValue=""
          rules={{
            required: t("must_enter_team_name"),
          }}
          render={({ field: { value } }) => (
            <>
              <TextField
                disabled={
                  /* E2e is too fast and it tries to fill this way before the form is ready */
                  !isLocaleReady || createTeamMutation.isPending
                }
                className="mt-2"
                placeholder="Acme Inc."
                name="name"
                label={t("team_name")}
                defaultValue={value}
                onChange={(e) => {
                  form.setValue("name", e?.target.value);
                  if (form.formState.touchedFields["slug"] === undefined) {
                    form.setValue("slug", slugify(e?.target.value));
                  }
                }}
                autoComplete="off"
                data-testid="team-name"
              />
            </>
          )}
        />
      </div>

      <div className="mb-8">
        <Controller
          name="slug"
          control={form.control}
          rules={{ required: t("team_url_required") }}
          render={({ field: { value } }) => (
            <TextField
              className="mt-2"
              name="slug"
              placeholder="acme"
              label={t("team_url")}
              addOnLeading={`${getBaseTeamUrl()}/`}
              value={value}
              defaultValue={value}
              onChange={(e) => {
                form.setValue("slug", slugify(e?.target.value, true), {
                  shouldTouch: true,
                });
                form.clearErrors("slug");
              }}
            />
          )}
        />
      </div>
      <DialogFooter showDivider className="relative">
        <Button
          disabled={createTeamMutation.isPending}
          color="secondary"
          onClick={onClose}
          className="w-full justify-center">
          {t("cancel")}
        </Button>
        <Button
          disabled={form.formState.isSubmitting || createTeamMutation.isPending}
          color="primary"
          type="submit"
          className="w-full justify-center"
          data-testid="continue-button">
          {t("submit")}
        </Button>
      </DialogFooter>
    </Form>
  );
};

const getBaseTeamUrl = () => {
  const urlSplit = WEBAPP_URL.replace(/https?:\/\//, "").split(".");
  const domain = urlSplit.length === 3 ? urlSplit.slice(1).join(".") : urlSplit.join(".");

  return `${domain}/team`;
};
