import { useState, useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { showToast } from "@calcom/ui";

export enum ButtonState {
  NONE = "none",
  ALLOW = "allow",
  DISABLE = "disable",
  DENIED = "denied",
}

export const useNotifications = () => {
  const [buttonToShow, setButtonToShow] = useState<ButtonState>(ButtonState.NONE);
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useLocale();

  useEffect(() => {
    const decideButtonToShow = async () => {
      if (!("Notification" in window)) {
        console.log("Notifications not supported");
      }

      const registration = await navigator.serviceWorker?.getRegistration();
      if (!registration) return;
      const subscription = await registration.pushManager.getSubscription();

      const permission = Notification.permission;

      if (permission === ButtonState.DENIED) {
        setButtonToShow(ButtonState.DENIED);
        return;
      }

      if (permission === "default") {
        setButtonToShow(ButtonState.ALLOW);
        return;
      }

      if (!subscription) {
        setButtonToShow(ButtonState.ALLOW);
        return;
      }

      setButtonToShow(ButtonState.DISABLE);
    };

    decideButtonToShow();
  }, []);

  const enableNotifications = async () => {
    setIsLoading(true);
    const permissionResponse = await Notification.requestPermission();

    if (permissionResponse === ButtonState.DENIED) {
      setButtonToShow(ButtonState.DENIED);
      setIsLoading(false);
      showToast(t("browser_notifications_denied"), "warning");
      return;
    }

    if (permissionResponse === "default") {
      setIsLoading(false);
      showToast(t("please_allow_notifications"), "warning");
      return;
    }

    const registration = await navigator.serviceWorker?.getRegistration();

    if (!registration) {
      // This will not happen ideally as the button will not be shown if the service worker is not registered
      return;
    }

    let subscription: PushSubscription;
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""),
      });
    } catch (error) {
      // This happens in Brave browser as it does not have a push service
      console.error(error);
      setIsLoading(false);
      setButtonToShow(ButtonState.NONE);
      showToast(t("browser_notifications_not_supported"), "error");
      return;
    }
  };

  const disableNotifications = async () => {
    setIsLoading(true);
    const registration = await navigator.serviceWorker?.getRegistration();
    if (!registration) {
      // This will not happen ideally as the button will not be shown if the service worker is not registered
      return;
    }
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      // This will not happen ideally as the button will not be shown if the subscription is not present
      return;
    }
  };

  return {
    buttonToShow,
    isLoading,
    enableNotifications,
    disableNotifications,
  };
};

const urlB64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};
