import { useSession } from "next-auth/react";

import type { EventSetupTabProps } from "@calcom/features/eventtypes/components/tabs/setup/EventSetupTab";
import { EventSetupTab } from "@calcom/features/eventtypes/components/tabs/setup/EventSetupTab";
import { WEBSITE_URL } from "@calcom/lib/constants";

const EventSetupTabWebWrapper = (props: EventSetupTabProps) => {
  const session = useSession();
  const urlPrefix = `${WEBSITE_URL?.replace(/^(https?:|)\/\//, "")}`;
  return (
    <EventSetupTab
      urlPrefix={urlPrefix}
      hasOrgBranding={false}
      orgId={session.data?.user.org?.id}
      {...props}
    />
  );
};

export default EventSetupTabWebWrapper;
