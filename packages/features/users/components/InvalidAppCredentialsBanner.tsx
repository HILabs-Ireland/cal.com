import { useRouter } from "next/navigation";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { type RouterOutputs } from "@calcom/trpc";
import { TopBanner } from "@calcom/ui";

export type InvalidAppCredentialBannersProps = {
  data: RouterOutputs["viewer"]["getUserTopBanners"]["invalidAppCredentialBanners"];
};

export function InvalidAppCredentialBanners() {
  return null;
}

export type InvalidAppCredentialBannerProps = {
  name: string;
  slug: string;
};

export function InvalidAppCredentialBanner({ name, slug }: InvalidAppCredentialBannerProps) {
  const { t } = useLocale();
  const router = useRouter();

  const handleClick = () => {
    router.push(`/apps/${slug}`);
  };

  return (
    <TopBanner
      text={` ${t("invalid_credential", { appName: name })} `}
      variant="warning"
      actions={
        <button className="border-b border-b-black" onClick={handleClick}>
          {t("invalid_credential_action")}
        </button>
      }
    />
  );
}
