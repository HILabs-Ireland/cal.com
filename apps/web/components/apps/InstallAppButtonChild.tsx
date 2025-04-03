import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { ButtonProps } from "@calcom/ui";
import { Button } from "@calcom/ui";

export const InstallAppButtonChild = ({
  multiInstall,
  credentials,
  ...props
}: {
  multiInstall?: boolean;
  credentials?: RouterOutputs["viewer"]["appCredentialsByType"]["credentials"];
} & ButtonProps) => {
  const { t } = useLocale();

  const shouldDisableInstallation = !multiInstall ? !!(credentials && credentials.length) : false;

  return (
    <Button
      data-testid="install-app-button"
      disabled={shouldDisableInstallation}
      color="primary"
      size="base"
      {...props}>
      {multiInstall ? t("install_another") : t("install_app")}
    </Button>
  );
};
