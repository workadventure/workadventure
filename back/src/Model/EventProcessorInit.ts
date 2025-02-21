import crypto from "crypto";
import { WebRtcSignalToClientMessage } from "@workadventure/messages";
import { TURN_STATIC_AUTH_SECRET } from "../Enum/EnvironmentVariable";
import { EventProcessor } from "./EventProcessor";

export const eventProcessor = new EventProcessor();

eventProcessor.registerPrivateEventProcessor("webRtcStartMessage", (event, senderId, receiverId) => {
    if (event.$case !== "webRtcStartMessage") {
        // FIXME: improve the typing of the method to avoid this
        throw new Error("Invalid event type");
    }

    if (TURN_STATIC_AUTH_SECRET) {
        const { username, password } = getTURNCredentials(senderId.toString(), TURN_STATIC_AUTH_SECRET);
        event.webRtcStartMessage.webRtcUserName = username;
        event.webRtcStartMessage.webRtcPassword = password;
    }
    return event;
});

eventProcessor.registerPrivateEventProcessor("webRtcSignalToServerMessage", (event, senderId, receiverId) => {
    if (event.$case !== "webRtcSignalToServerMessage") {
        // FIXME: improve the typing of the method to avoid this
        throw new Error("Invalid event type");
    }

    const signal = event.webRtcSignalToServerMessage.signal;

    const webrtcSignalToClientMessage: Partial<WebRtcSignalToClientMessage> = {
        signal,
    };

    if (TURN_STATIC_AUTH_SECRET) {
        const { username, password } = getTURNCredentials(senderId.toString(), TURN_STATIC_AUTH_SECRET);
        webrtcSignalToClientMessage.webRtcUserName = username;
        webrtcSignalToClientMessage.webRtcPassword = password;
    }

    return {
        $case: "webRtcSignalToClientMessage",
        webRtcSignalToClientMessage: WebRtcSignalToClientMessage.fromPartial(webrtcSignalToClientMessage),
    };
});

eventProcessor.registerPrivateEventProcessor(
    "webRtcScreenSharingSignalToServerMessage",
    (event, senderId, receiverId) => {
        if (event.$case !== "webRtcScreenSharingSignalToServerMessage") {
            // FIXME: improve the typing of the method to avoid this
            throw new Error("Invalid event type");
        }

        const signal = event.webRtcScreenSharingSignalToServerMessage.signal;

        const webrtcSignalToClientMessage: Partial<WebRtcSignalToClientMessage> = {
            signal,
        };

        if (TURN_STATIC_AUTH_SECRET) {
            const { username, password } = getTURNCredentials(senderId.toString(), TURN_STATIC_AUTH_SECRET);
            webrtcSignalToClientMessage.webRtcUserName = username;
            webrtcSignalToClientMessage.webRtcPassword = password;
        }

        return {
            $case: "webRtcScreenSharingSignalToClientMessage",
            webRtcScreenSharingSignalToClientMessage:
                WebRtcSignalToClientMessage.fromPartial(webrtcSignalToClientMessage),
        };
    }
);

function getTURNCredentials(name: string, secret: string): { username: string; password: string } {
    const unixTimeStamp = Math.floor(Date.now() / 1000) + 4 * 3600; // this credential would be valid for the next 4 hours
    const username = [unixTimeStamp, name].join(":");
    const hmac = crypto.createHmac("sha1", secret);
    hmac.setEncoding("base64");
    hmac.write(username);
    hmac.end();
    const password = String(hmac.read() || "");
    return {
        username,
        password,
    };
}
