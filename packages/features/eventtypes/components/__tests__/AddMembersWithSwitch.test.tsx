import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import type { Host, TeamMember } from "../../lib/types";
import type { AddMembersWithSwitchProps } from "../AddMembersWithSwitch";
import { AddMembersWithSwitch } from "../AddMembersWithSwitch";

// Mock matchMedia
vi.mock("@formkit/auto-animate/react", () => ({
  useAutoAnimate: () => [null],
}));

// Mock Segment component

const mockTeamMembers: TeamMember[] = [
  {
    value: "1",
    label: "John Doe",
    avatar: "avatar1.jpg",
    email: "john@example.com",
    defaultScheduleId: 1,
  },
  {
    value: "2",
    label: "Jane Smith",
    avatar: "avatar2.jpg",
    email: "jane@example.com",
    defaultScheduleId: 2,
  },
];

// Mock trpc
vi.mock("@calcom/trpc", () => ({
  trpc: {
    useUtils: () => ({
      viewer: {
        appRoutingForms: {
          getAttributesForTeam: {
            prefetch: vi.fn(),
          },
        },
      },
    }),
  },
}));

const renderComponent = ({
  componentProps,
  formDefaultValues = {
    assignRRMembersUsingSegment: false,
    rrSegmentQueryValue: null,
    hosts: [],
  },
}: {
  componentProps: AddMembersWithSwitchProps;
  formDefaultValues?: Record<string, unknown>;
}) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const methods = useForm({
      defaultValues: formDefaultValues,
    });
    const [assignAllTeamMembers, setAssignAllTeamMembers] = React.useState(false);
    console.log(methods.getValues());
    return (
      <FormProvider {...methods}>
        {React.cloneElement(children as React.ReactElement, {
          assignAllTeamMembers,
          setAssignAllTeamMembers,
        })}
      </FormProvider>
    );
  };

  return render(<AddMembersWithSwitch {...componentProps} />, { wrapper: Wrapper });
};

describe("AddMembersWithSwitch", () => {
  const defaultProps = {
    teamMembers: mockTeamMembers,
    value: [] as Host[],
    onChange: vi.fn(),
    onActive: vi.fn(),
    isFixed: false,
    teamId: 1,
  };

  it("should render in TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_NOT_APPLICABLE state", () => {
    renderComponent({
      componentProps: {
        ...defaultProps,
        assignAllTeamMembers: false,
        isSegmentApplicable: false,
        automaticAddAllEnabled: false,
      },
    });
    expect(screen.queryByTestId("assign-all-team-members-toggle")).not.toBeInTheDocument();
    expectManualHostListToBeThere();
  });

  it("should render in TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_APPLICABLE state", () => {
    renderComponent({
      componentProps: {
        ...defaultProps,
        assignAllTeamMembers: false,
        isSegmentApplicable: false,
        automaticAddAllEnabled: true,
      },
    });

    expect(screen.getByTestId("assign-all-team-members-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("assign-all-team-members-toggle").getAttribute("aria-checked")).toBe("false");
    expectManualHostListToBeThere();
  });

  it("should render in ALL_TEAM_MEMBERS_ENABLED_AND_SEGMENT_NOT_APPLICABLE state", () => {
    renderComponent({
      componentProps: {
        ...defaultProps,
        assignAllTeamMembers: true,
        isSegmentApplicable: false,
      },
      formDefaultValues: {
        assignRRMembersUsingSegment: true,
        rrSegmentQueryValue: null,
        hosts: [],
      },
    });

    expect(screen.queryByTestId("assign-all-team-members-toggle")).not.toBeInTheDocument();
    expect(screen.queryByText("filter_by_attributes")).not.toBeInTheDocument();
  });

  it("should call onChange when team members are selected", () => {
    renderComponent({ componentProps: defaultProps });

    const combobox = screen.getByRole("combobox");
    fireEvent.focus(combobox);
    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    fireEvent.click(screen.getByText("John Doe"));

    expect(defaultProps.onChange).toHaveBeenCalled();
  });
});

function expectManualHostListToBeThere() {
  expect(screen.getByRole("combobox")).toBeInTheDocument();
}
