import { z } from "zod";
import { ListenC2SEvent } from "./client-to-server-events/ListenC2SEvent";
import { UserMessageC2SEvent } from "./client-to-server-events/UserMessageC2SEvent";
import { ErrorS2CEvent } from "./server-to-client-events/ErrorS2CEvent";
import { MemberJoinedS2CEvent } from "./server-to-client-events/MemberJoinedS2CEvent";
import { MemberLeftS2CEvent } from "./server-to-client-events/MemberLeftS2CEvent";

export * from "./client-to-server-events/ListenC2SEvent";
export * from "./client-to-server-events/UserMessageC2SEvent";
export * from "./server-to-client-events/ErrorS2CEvent";
export * from "./server-to-client-events/MemberJoinedS2CEvent";
export * from "./server-to-client-events/MemberLeftS2CEvent";

export const AdminRoomClientToServerEvents = z.object({
    listen: ListenC2SEvent,
    "user-message": UserMessageC2SEvent,
});

export const AdminRoomServerToClientEvents = z.object({
    error: ErrorS2CEvent,
    "member-joined": MemberJoinedS2CEvent,
    "member-left": MemberLeftS2CEvent,
});

export const AdminRoomInterServerEvents = z.object({});

export  const AdminRoomSocketData = z.object({});

export type AdminRoomClientToServerEvents = z.infer<typeof AdminRoomClientToServerEvents>;
export type AdminRoomClientToServerFunctions = {
    [K in keyof AdminRoomClientToServerEvents]: (data: AdminRoomClientToServerEvents[K]) => void;
};
export type AdminRoomServerToClientEvents = z.infer<typeof AdminRoomServerToClientEvents>;
export type AdminRoomServerToClientFunctions = {
    [K in keyof AdminRoomServerToClientEvents]: (data: AdminRoomServerToClientEvents[K]) => void;
};
export type AdminRoomInterServerEvents = z.infer<typeof AdminRoomInterServerEvents>;
export type AdminRoomInterServerFunctions = {
    [K in keyof AdminRoomInterServerEvents]: (data: AdminRoomInterServerEvents[K]) => void;
};
export type AdminRoomSocketData = z.infer<typeof AdminRoomSocketData>;
