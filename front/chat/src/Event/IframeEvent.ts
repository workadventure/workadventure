import { z } from "zod";
import { isNotification } from "./Notification";
import { isUserData } from "../Messages/JsonMessages/ChatData";
import { isLocale } from "./Locale";

export const isIframeEventWrapper = z.union([
  z.object({
    type: z.literal("pushNotification"),
    data: isNotification,
  }),
  z.object({
    type: z.literal("userData"),
    data: isUserData,
  }),
  z.object({
    type: z.literal("setLocale"),
    data: isLocale,
  }),
]);

export const isLookingLikeIframeEventWrapper = z.object({
  type: z.string(),
  data: z.unknown().optional(),
});
