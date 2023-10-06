import { z } from "zod";
import { ListenC2SEvent } from "./client-to-server-events/ListenC2SEvent";
import { UserMessageC2SEvent } from "./client-to-server-events/UserMessageC2SEvent";
import { ErrorS2CEvent } from "./server-to-client-events/ErrorS2CEvent";
import { MemberJoinedS2CEvent } from "./server-to-client-events/MemberJoinedS2CEvent";
import { MemberLeftS2CEvent } from "./server-to-client-events/MemberLeftS2CEvent";

export const AdminRoomClientToServerEvents = z.object({
    listen: z.function().args(ListenC2SEvent).returns(z.void()),
    "user-message": z.function().args(UserMessageC2SEvent).returns(z.void()),
});

export const AdminRoomServerToClientEvents = z.object({
    error: z.function().args(ErrorS2CEvent).returns(z.void()),
    "member-joined": z.function().args(MemberJoinedS2CEvent).returns(z.void()),
    "member-left": z.function().args(MemberLeftS2CEvent).returns(z.void()),
});

export const AdminRoomInterServerEvents = z.object({});

export  const AdminRoomSocketData = z.object({});

export type AdminRoomClientToServerEvents = z.infer<typeof AdminRoomClientToServerEvents>;
export type AdminRoomServerToClientEvents = z.infer<typeof AdminRoomServerToClientEvents>;
export type AdminRoomInterServerEvents = z.infer<typeof AdminRoomInterServerEvents>;
export type AdminRoomSocketData = z.infer<typeof AdminRoomSocketData>;
