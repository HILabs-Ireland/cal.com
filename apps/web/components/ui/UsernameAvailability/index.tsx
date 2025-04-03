import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { RefCallback, ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";

import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { WEBSITE_URL } from "@calcom/lib/constants";
import type { TRPCClientErrorLike } from "@calcom/trpc/client";
import { trpc } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";

import useRouterQuery from "@lib/hooks/useRouterQuery";

interface UsernameAvailabilityFieldProps {
  onSuccessMutation?: () => void;
  onErrorMutation?: (error: TRPCClientErrorLike<AppRouter>) => void;
}

interface ICustomUsernameProps extends UsernameAvailabilityFieldProps {
  currentUsername: string | undefined;
  setCurrentUsername?: (newUsername: string) => void;
  inputUsernameValue: string | undefined;
  usernameRef: RefCallback<HTMLInputElement>;
  setInputUsernameValue: (value: string) => void;
  disabled?: boolean | undefined;
  addOnLeading?: ReactNode;
}

const UsernameTextfield = dynamic(() => import("./UsernameTextfield").then((m) => m.UsernameTextfield), {
  ssr: false,
});

export const UsernameAvailability = (props: ICustomUsernameProps) => {
  const { ...otherProps } = props;
  const UsernameAvailabilityComponent = UsernameTextfield;
  return <UsernameAvailabilityComponent {...otherProps} />;
};

export const UsernameAvailabilityField = ({
  onSuccessMutation,
  onErrorMutation,
}: UsernameAvailabilityFieldProps) => {
  const searchParams = useSearchParams();
  const [user] = trpc.viewer.me.useSuspenseQuery();
  const [currentUsernameState, setCurrentUsernameState] = useState(user.username || "");
  const { username: usernameFromQuery, setQuery: setUsernameFromQuery } = useRouterQuery("username");
  const { username: currentUsername, setQuery: setCurrentUsername } =
    searchParams?.get("username") && user.username === null
      ? { username: usernameFromQuery, setQuery: setUsernameFromQuery }
      : { username: currentUsernameState || "", setQuery: setCurrentUsernameState };
  const formMethods = useForm({
    defaultValues: {
      username: currentUsername,
    },
  });

  const orgBranding = useOrgBranding();

  const usernamePrefix = orgBranding
    ? orgBranding?.fullDomain.replace(/^(https?:|)\/\//, "")
    : `${WEBSITE_URL?.replace(/^(https?:|)\/\//, "")}`;

  return (
    <Controller
      control={formMethods.control}
      name="username"
      render={({ field: { ref, onChange, value } }) => (
        <UsernameAvailability
          currentUsername={currentUsername}
          setCurrentUsername={setCurrentUsername}
          inputUsernameValue={value}
          usernameRef={ref}
          setInputUsernameValue={onChange}
          onSuccessMutation={onSuccessMutation}
          onErrorMutation={onErrorMutation}
          disabled={!!user.organization?.id}
          addOnLeading={`${usernamePrefix}/`}
        />
      )}
    />
  );
};
