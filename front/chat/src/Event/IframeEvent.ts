import { z } from "zod";
import {isNotification} from "./Notification";


export interface TypedMessageEvent<T> extends MessageEvent {
    data: T;
}

export const isPushNotification = z.object({
    type: z.literal("pushNotification"),
    data: isNotification,
});
