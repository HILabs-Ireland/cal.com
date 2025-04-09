"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui";

export const AdminAPIView = () => {
  const { t } = useLocale();

  const features = [
    {
      icon: <Icon name="terminal" className="h-5 w-5 text-pink-500" />,
      title: t("admin_api"),
      description: t("leverage_our_api"),
    },
    {
      icon: <Icon name="sparkles" className="h-5 w-5 text-blue-500" />,
      title: "Cal.ai",
      description: t("use_cal_ai_to_make_call_description"),
    },
  ];
  return (
    <div className="mt-8">
      <>Create Org</>
    </div>
  );
};

export default AdminAPIView;
