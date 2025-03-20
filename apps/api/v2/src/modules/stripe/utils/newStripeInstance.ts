import Stripe from "stripe";

export const stripeInstance = new Stripe("", {
  apiVersion: "2020-08-27",
});
