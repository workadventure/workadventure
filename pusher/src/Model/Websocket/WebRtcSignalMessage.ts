import * as tg from "generic-type-guard";

export const isSignalData =
    new tg.IsInterface().withProperties({
        type: tg.isOptional(tg.isString)
    }).get();

export const isWebRtcSignalMessageInterface =
    new tg.IsInterface().withProperties({
        receiverId: tg.isNumber,
        signal: isSignalData
    }).get();
export const isWebRtcScreenSharingStartMessageInterface =
    new tg.IsInterface().withProperties({
        userId: tg.isNumber,
        roomId: tg.isString
    }).get();
export type WebRtcSignalMessageInterface = tg.GuardedType<typeof isWebRtcSignalMessageInterface>;
