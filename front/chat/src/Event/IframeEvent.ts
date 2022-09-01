import { z } from "zod";
import { isNotification } from "./Notification";
import { isUserData } from "../Messages/JsonMessages/ChatData";
import { isLocale } from "./Locale";
import { isLeaveMucEvent } from "./LeaveMucEvent";
import { isJoinMucEvent } from "./JoinMucEvent";
import { isChatVisibility } from "./ChatVisibility";
import { isSettings } from "./Settings";

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
    z.object({
        type: z.literal("chatVisibility"),
        data: isChatVisibility,
    }),
    z.object({
        type: z.literal("settings"),
        data: isSettings,
    }),
    z.object({
        type: z.literal("availabilityStatus"),
        data: z.number(),
    }),

    //TODO delete with chat XMPP integration for the discussion circle
    z.object({
        type: z.literal("updateWritingStatusChatList"),
        data: z.any(),
    }),
    z.object({
        type: z.literal("addChatMessage"),
        data: z.any(),
    }),
    z.object({
        type: z.literal("comingUser"),
        data: z.any(),
    }),
    z.object({
        type: z.literal("peerConnectionStatus"),
        data: z.boolean(),
    }),
]);

export const isLookingLikeIframeEventWrapper = z.object({
    type: z.string(),
    data: z.unknown().optional(),
});
