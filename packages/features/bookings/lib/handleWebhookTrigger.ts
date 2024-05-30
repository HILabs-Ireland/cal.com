import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import type { WebhookDataType } from "@calcom/features/webhooks/lib/sendPayload";
import sendPayload from "@calcom/features/webhooks/lib/sendPayload";
import logger from "@calcom/lib/logger";

export async function handleWebhookTrigger(args: {
  subscriberOptions: GetSubscriberOptions;
  eventTrigger: string;
  webhookData: Omit<WebhookDataType, "createdAt" | "triggerEvent">;
}) {
  try {
    const subscribers = await getWebhooks(args.subscriberOptions);

    const promises = subscribers.map((sub) =>
      sendPayload(sub.secret, args.eventTrigger, new Date().toISOString(), sub, args.webhookData)
        .then((res) => {
          console.log(
            `Webhook Response ok: ${res?.ok} status: ${res?.status} bookingId: ${args.webhookData?.bookingId} uid: ${args.webhookData?.uid}`
          );
          if (!res?.ok) {
            console.error(
              `Webhook error for event: ${args.eventTrigger} bookingId: ${args.webhookData?.bookingId} uid: ${args.webhookData?.uid}`
            );
          }
        })
        .catch((e) => {
          console.error(
            `Error executing webhook for event: ${args.eventTrigger}, URL: ${sub.subscriberUrl}`,
            e
          );
          console.error(
            `Error executing webhook for event: bookingId: ${args.webhookData?.bookingId}, uid: ${args.webhookData?.uid}`
          );
        })
    );
    await Promise.all(promises);
  } catch (error) {
    logger.error("Error while sending webhook", error);
  }
}
