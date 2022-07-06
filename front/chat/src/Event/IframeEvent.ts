import { z } from "zod";
import { isNotification } from "./Notification";
import { isUserData } from "../Messages/JsonMessages/ChatData";
import { isLocale } from "./Locale";
import { isLeaveMucEvent } from "./LeaveMucEvent";
import { isJoinMucEvent } from "./JoinMucEvent";

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
  z.object({
    type: z.literal("leaveMuc"),
    data: isLeaveMucEvent,
  }),
  z.object({
    type: z.literal("joinMuc"),
    data: isJoinMucEvent,
  }),
]);

export const isLookingLikeIframeEventWrapper = z.object({
  type: z.string(),
  data: z.unknown().optional(),
});
