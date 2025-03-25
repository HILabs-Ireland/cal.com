import { JOIN_COMMUNITY } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui";

import FreshChatMenuItem from "../lib/freshchat/FreshChatMenuItem";
import HelpscoutMenuItem from "../lib/helpscout/HelpscoutMenuItem";
import ZendeskMenuItem from "../lib/zendesk/ZendeskMenuItem";

interface ContactMenuItem {
  onHelpItemSelect: () => void;
}

export default function ContactMenuItem(props: ContactMenuItem) {
  const { t } = useLocale();
  const { onHelpItemSelect } = props;
  return (
    <>
      <>
        <ZendeskMenuItem onHelpItemSelect={onHelpItemSelect} />
        <HelpscoutMenuItem onHelpItemSelect={onHelpItemSelect} />
        <FreshChatMenuItem onHelpItemSelect={onHelpItemSelect} />
      </>

      <a
        href={JOIN_COMMUNITY}
        target="_blank"
        className="hover:bg-subtle hover:text-emphasis text-default flex w-full px-5 py-2 pr-4 text-sm font-medium transition">
        {t("community_support")}{" "}
        <Icon
          name="external-link"
          className="group-hover:text-subtle text-muted ml-1 mt-px h-4 w-4 flex-shrink-0 ltr:mr-3"
        />
      </a>
    </>
  );
}
