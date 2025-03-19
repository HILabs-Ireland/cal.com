/* eslint-disable turbo/no-undeclared-env-vars */
export const PREMIUM_PLAN_PRODUCT_ID = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PLAN_PRODUCT_ID || "";

export const paymentOptions = [
  {
    label: "on_booking_option",
    value: "ON_BOOKING",
  },
  {
    label: "hold_option",
    value: "HOLD",
  },
];
