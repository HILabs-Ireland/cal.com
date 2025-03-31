import { post } from "@calcom/lib/fetch-wrapper";

import type { BookingCreateBody } from "../types";

export const createInstantBooking = async (data: BookingCreateBody) => {
  const response = await post("/api/book/instant-event", data);
  return response;
};
