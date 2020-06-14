import * as tg from "generic-type-guard";

export const isWebRtcSignalMessageInterface =
    new tg.IsInterface().withProperties({
        userId: tg.isString,
        receiverId: tg.isString,
        roomId: tg.isString,
        signal: tg.isUnknown
    }).get();
export const isWebRtcScreenSharingSignalMessageInterface =
    new tg.IsInterface().withProperties({
        userId: tg.isString,
        roomId: tg.isString,
        signal: tg.isUnknown
    }).get();
export const isWebRtcScreenSharingStartMessageInterface =
    new tg.IsInterface().withProperties({
        userId: tg.isString,
        roomId: tg.isString
    }).get();
export type WebRtcSignalMessageInterface = tg.GuardedType<typeof isWebRtcSignalMessageInterface>;
