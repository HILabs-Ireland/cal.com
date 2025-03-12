// @NOTE: should we remove this? It's just a wrapper of env vars
import { PREMIUM_PLAN_PRODUCT_ID } from "./constants";

export function getPremiumPlanProductId(): string {
  return PREMIUM_PLAN_PRODUCT_ID;
}

export function getPremiumPlanPriceValue() {
  return "$29/mo";
}
