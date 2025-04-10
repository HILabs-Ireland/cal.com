import type { Tag } from "@calcom/app-store/types";
import type { AppMeta } from "@calcom/types/App";

const PushEventPrefix = "cal_analytics_app_";

// AnalyticApp has appData.tag always set
type AnalyticApp = Omit<AppMeta, "appData"> & {
  appData: Omit<NonNullable<AppMeta["appData"]>, "tag"> & {
    tag: NonNullable<NonNullable<AppMeta["appData"]>["tag"]>;
  };
};

const getPushEventScript = ({ tag, appId }: { tag: Tag; appId: string }) => {
  if (!tag.pushEventScript) {
    return tag.pushEventScript;
  }

  return {
    ...tag.pushEventScript,
    // In case of complex pushEvent implementations, we could think about exporting a pushEvent function from the analytics app maybe but for now this should suffice
    content: tag.pushEventScript?.content?.replace("$pushEvent", `${PushEventPrefix}_${appId}`),
  };
};

export function handleEvent(event: { detail: Record<string, unknown> & { type: string } }) {
  const { type: name, ...data } = event.detail;
  // Don't push internal events to analytics apps
  // They are meant for internal use like helping embed make some decisions
  if (name.startsWith("__")) {
    return false;
  }

  Object.entries(window).forEach(([prop, value]) => {
    if (!prop.startsWith(PushEventPrefix) || typeof value !== "function") {
      return;
    }
    // Find the pushEvent if defined by the analytics app
    const pushEvent = window[prop as keyof typeof window];

    pushEvent({
      name,
      data,
    });
  });

  // Support sending all events to opener which is currently used by ReroutingDialog to identify if the booking is successfully rescheduled.
  if (window.opener) {
    window.opener.postMessage(
      {
        type: `CAL:${name}`,
        ...data,
      },
      "*"
    );
  }
  return true;
}
