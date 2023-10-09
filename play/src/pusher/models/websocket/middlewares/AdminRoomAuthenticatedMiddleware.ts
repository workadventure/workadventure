import { Socket } from "socket.io";
import { ExtendedError } from "socket.io/dist/namespace";
import { jwtTokenManager } from "../../../services/JWTTokenManager";
import * as Sentry from "@sentry/node";
import { ErrorS2CEvent } from "../../../../../../libs/socket-namespaces/src/admin-room/server-to-client-events/ErrorS2CEvent";

export default (socket: Socket, next: (err?: ExtendedError | undefined) => void) => {
    const token = socket.handshake.auth.token;

    try {
        jwtTokenManager.verifyAdminSocketToken(token);
        next();
    } catch (e) {
        Sentry.captureException(`Admin socket access refused for token: ${token} ${e}`);
        console.error("Admin socket access refused for token: " + token, e);
        socket.emit("error", {
            message: "Admin socket access refused! The connection has been closed."
        } satisfies ErrorS2CEvent);
        socket.disconnect(true);
        return;
    }
};
