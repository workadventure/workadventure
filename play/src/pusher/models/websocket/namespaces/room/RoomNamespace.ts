import { z } from "zod";

export const RoomClientToServerEvents = z.object({
    "viewport": z.function().args().returns(z.void()),
    "user-moves": z.function().args().returns(z.void()),
    "play-global-message": z.function().args().returns(z.void()),
    "report-player": z.function().args().returns(z.void()),
    "add-space-filter": z.function().args().returns(z.void()),
    "update-space-filter": z.function().args().returns(z.void()),
    "removes-pace-filter": z.function().args().returns(z.void()),
    "set-player-details": z.function().args().returns(z.void()),
    "watch-space": z.function().args().returns(z.void()),
    "unwatch-space": z.function().args().returns(z.void()),
    "camera-state": z.function().args().returns(z.void()),
    "microphone-state": z.function().args().returns(z.void()),
    "screen-sharing-state": z.function().args().returns(z.void()),
    "megaphone-state": z.function().args().returns(z.void()),
    "jitsi-participant-id-space": z.function().args().returns(z.void()),
    "query": z.function().args().returns(z.void()),
    "item-event": z.function().args().returns(z.void()),
    "variable": z.function().args().returns(z.void()),
    "web-rtc-signal-to-server": z.function().args().returns(z.void()),
    "web-rtc-screen-sharing-signal-to-server": z.function().args().returns(z.void()),
    "emote-prompt": z.function().args().returns(z.void()),
    "follow-request": z.function().args().returns(z.void()),
    "follow-confirmation": z.function().args().returns(z.void()),
    "follow-abort": z.function().args().returns(z.void()),
    "lock-group-prompt": z.function().args().returns(z.void()),
    "ping": z.function().args().returns(z.void()),
    "edit-map-command": z.function().args().returns(z.void()),
    "ask-position": z.function().args().returns(z.void()),
});

export const RoomServerToClientEvents = z.object({
});

export const RoomInterServerEvents = z.object({});

export  const RoomSocketData = z.object({});

export type RoomClientToServerEvents = z.infer<typeof RoomClientToServerEvents>;
export type RoomServerToClientEvents = z.infer<typeof RoomServerToClientEvents>;
export type RoomInterServerEvents = z.infer<typeof RoomInterServerEvents>;
export type RoomSocketData = z.infer<typeof RoomSocketData>;
