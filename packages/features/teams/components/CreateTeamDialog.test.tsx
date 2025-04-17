import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi } from "vitest";

import { CreateTeamDialog } from "./CreateTeamDialog";

const invalidateTeamsListQueryMock = vi.fn();
const createTeamMutationMock = vi.fn();
let createTeamMutationResultMock: any;

const useCreateTeamMutationMock = vi.fn(({ onSuccess, onError }) => {
  createTeamMutationResultMock = {
    mutate: vi.fn((vals) => createTeamMutationMock(vals)),
    isPending: false,
    __success: () => onSuccess?.(),
    __error: (err: any) => onError?.(err),
  };
  return createTeamMutationResultMock;
});

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    useUtils: () => ({
      viewer: {
        teams: {
          list: { invalidate: invalidateTeamsListQueryMock },
        },
      },
    }),
    viewer: {
      teams: {
        create: {
          useMutation: (...args: any[]) => useCreateTeamMutationMock(...args),
        },
      },
    },
  },
}));

const renderOpenDialog = async () => {
  const result = render(
    <CreateTeamDialog>
      {({ open }) => (
        <button type="button" onClick={open} data-testid="open-dialog">
          open
        </button>
      )}
    </CreateTeamDialog>
  );

  await userEvent.click(result.getByTestId("open-dialog"));

  return result;
};

describe("CreateTeamDialog", () => {
  it("opens and closes correctly", async () => {
    const result = await renderOpenDialog();

    expect(result.getByRole("dialog")).toBeInTheDocument();

    await userEvent.click(result.getByText("cancel"));
    await waitFor(() => expect(result.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("auto‑generates and updates slug from name", async () => {
    const result = await renderOpenDialog();

    const nameInput = result.getByTestId("team-name");
    const slugInput = result.getByLabelText(/team_url/i);

    await userEvent.type(nameInput, "Test Team Name");
    await expect(slugInput).toHaveValue("test-team-name");
  });

  it("does not override custom slug", async () => {
    const result = await renderOpenDialog();

    const nameInput = result.getByTestId("team-name");
    const slugInput = result.getByLabelText(/team_url/i);

    await userEvent.clear(slugInput);
    await userEvent.type(slugInput, "custom-slug");
    await userEvent.type(nameInput, "Test Team Name");

    await expect(slugInput).toHaveValue("custom-slug");
  });

  it("shows required field errors when submitted empty", async () => {
    const result = await renderOpenDialog();
    await userEvent.click(result.getByTestId("continue-button"));

    await expect(await result.findByText("must_enter_team_name")).toBeVisible();
    await expect(await result.findByText("team_url_required")).toBeVisible();
    expect(createTeamMutationMock).not.toHaveBeenCalled();
  });

  it("submits valid data, invalidates cache and closes", async () => {
    const result = await renderOpenDialog();

    await userEvent.type(result.getByTestId("team-name"), "Super Team");
    const slugInput = result.getByLabelText(/team_url/i);
    await userEvent.clear(slugInput);
    await userEvent.type(slugInput, "Super Team");

    await userEvent.click(result.getByTestId("continue-button"));

    expect(createTeamMutationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Super Team",
        slug: "superteam",
      })
    );

    createTeamMutationResultMock.__success();

    expect(invalidateTeamsListQueryMock).toHaveBeenCalled();
    await waitFor(() => expect(result.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("shows field error when slug is taken", async () => {
    const result = await renderOpenDialog();

    await userEvent.type(result.getByTestId("team-name"), "Foo");
    await userEvent.click(result.getByTestId("continue-button"));

    createTeamMutationResultMock.__error({ message: "team_url_taken" });

    await expect(await result.findByText("url_taken")).toBeVisible();
  });

  it("shows alert for generic server errors", async () => {
    const result = await renderOpenDialog();

    await userEvent.type(result.getByTestId("team-name"), "Foo");
    await userEvent.click(result.getByTestId("continue-button"));

    createTeamMutationResultMock.__error({ message: "something_bad" });

    await expect(await result.findByText("something_bad")).toBeVisible();
  });
});
