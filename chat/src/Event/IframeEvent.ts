import { z } from "zod";
import { isUserData } from "@workadventure/messages";
import {
    KLAXOON_ACTIVITY_PICKER_EVENT,
    isKlaxoonEvent,
    isXmppSettingsMessageEvent,
    isChatMessage,
} from "@workadventure/shared-utils";
import { isUpdateWritingStatusChatListEvent } from "@workadventure/shared-utils/src/Events/UpdateWritingStatusChatListEvent";
import { isNotification } from "./Notification";
import { isLocale } from "./Locale";
import { isLeaveMucEvent } from "./LeaveMucEvent";
import { isJoinMucEvent } from "./JoinMucEvent";
import { isChatVisibility } from "./ChatVisibility";
import { isSettings } from "./SettingsEvent";
import { isOpenCoWebsite } from "./OpenCoWebsite";

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
    z.object({
        type: z.literal("xmppSettingsMessage"),
        data: isXmppSettingsMessageEvent,
    }),
    z.object({
        type: z.literal("openCoWebsite"),
        data: isOpenCoWebsite,
    }),

    //TODO delete with chat XMPP integration for the discussion circle
    z.object({
        type: z.literal("updateWritingStatusChatList"),
        data: isUpdateWritingStatusChatListEvent,
    }),
    z.object({
        type: z.literal("addChatMessage"),
        data: isChatMessage,
    }),
    z.object({
        type: z.literal("comingUser"),
        data: z.any(),
    }),
    z.object({
        type: z.literal("peerConnectionStatus"),
        data: z.boolean(),
    }),

    // The integration tool to use for the chat
    z.object({
        type: z.literal("klaxoonToolActivated"),
        data: z.boolean().optional().default(false),
    }),
    z.object({
        type: z.literal("youtubeToolActivated"),
        data: z.boolean().optional().default(false),
    }),
    z.object({
        type: z.literal("googleDocsToolActivated"),
        data: z.boolean().optional().default(false),
    }),
    z.object({
        type: z.literal("googleSheetsToolActivated"),
        data: z.boolean().optional().default(false),
    }),
    z.object({
        type: z.literal("googleSlidesToolActivated"),
        data: z.boolean().optional().default(false),
    }),
    z.object({
        type: z.literal(KLAXOON_ACTIVITY_PICKER_EVENT),
        payload: isKlaxoonEvent,
    }),
    z.object({
        type: z.literal("eraserToolActivated"),
        data: z.boolean().optional().default(false),
    }),
]);

export const isLookingLikeIframeEventWrapper = z.object({
    type: z.string(),
    data: z.unknown().optional(),
    payload: z.unknown().optional(),
});

export type lookingLikeIframeEventWrapper = z.infer<typeof isLookingLikeIframeEventWrapper>;
