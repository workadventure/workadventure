import { Socket } from "socket.io";
import { ExtendedError } from "socket.io/dist/namespace";
import { z, ZodObject } from "zod";
import * as Sentry from "@sentry/node";

export default (clientToServerEvents: ZodObject<any, any, any, any, any>) => {
    return (socket: Socket, next: (err?: ExtendedError | undefined) => void) => {
        socket.onAny((eventName, data) => {
            try {
                clientToServerEvents.shape[eventName].parse(data);
                next();
            } catch (err) {
                if (err instanceof z.ZodError) {
                    console.error(err.issues);
                    Sentry.captureException(err.issues);
                }
                Sentry.captureException(`Invalid message received. ${data}`);
                console.error("Invalid message received.", data);
                socket.emit("error", {
                    message: "Invalid message received! The connection has been closed.",
                });
                socket.disconnect(true);
                return;
            }
        });
    };
};
