import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Stripe",
  description: _package.description,
  installed: false,
  slug: "stripe",
  category: "payment",
  categories: ["payment"],
  logo: "icon.svg",
  publisher: "Cal.com",
  title: "Stripe",
  type: "stripe_payment",
  url: "https://cal.com/",
  docsUrl: "https://stripe.com/docs",
  variant: "payment",
  extendsFeature: "EventType",
  email: "help@cal.com",
  dirName: "stripepayment",
  isOAuth: true,
} as AppMeta;

export default metadata;
