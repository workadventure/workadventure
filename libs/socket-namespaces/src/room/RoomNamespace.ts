import { ViewportMessage } from "@workadventure/messages";
import { unknown, z } from "zod";
import { ErrorS2CEvent } from "./server-to-client-events/ErrorS2CEvent";

export * from "./QueryRoomNamespace";
export * from "./server-to-client-events/ErrorS2CEvent";

export const RoomClientToServerEvents = z.object({
    "message": z.any(),
});

export const RoomServerToClientEvents = z.object({
    error: ErrorS2CEvent,
    message: z.any(),
});

export const RoomInterServerEvents = z.object({});

export  const RoomSocketData = z.object({});

export type RoomClientToServerEvents = z.infer<typeof RoomClientToServerEvents>;
export type RoomClientToServerFunctions = {
    [K in keyof RoomClientToServerEvents]: (data: RoomClientToServerEvents[K]) => void;
};
export type RoomServerToClientEvents = z.infer<typeof RoomServerToClientEvents>;
export type RoomServerToClientFunctions = {
    [K in keyof RoomServerToClientEvents]: (data: RoomServerToClientEvents[K]) => void;
};
export type RoomInterServerEvents = z.infer<typeof RoomInterServerEvents>;
export type RoomInterServerFunctions = {
    [K in keyof RoomInterServerEvents]: (data: RoomInterServerEvents[K]) => void;
};
export type RoomSocketData = z.infer<typeof RoomSocketData>;
