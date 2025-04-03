"use client";

import type { ReactElement } from "react";

import Shell from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Icon } from "@calcom/ui";

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const { data: user } = trpc.viewer.me.useQuery();

  const features = [
    {
      icon: <Icon name="users" className="h-5 w-5" />,
      title: t("view_bookings_across"),
      description: t("view_bookings_across_description"),
    },
    {
      icon: <Icon name="refresh-ccw" className="h-5 w-5" />,
      title: t("identify_booking_trends"),
      description: t("identify_booking_trends_description"),
    },
    {
      icon: <Icon name="user-plus" className="h-5 w-5" />,
      title: t("spot_popular_event_types"),
      description: t("spot_popular_event_types_description"),
    },
  ];

  return (
    <div>
      <Shell
        withoutMain={false}
        withoutSeo={true}
        heading={t("insights")}
        subtitle={t("insights_subtitle")}
        title={t("insights")}
        description={t("insights_subtitle")}>
        {!user ? null : children}
      </Shell>
    </div>
  );
}

export const getInsightsLayout = (page: ReactElement) => <InsightsLayout>{page}</InsightsLayout>;
