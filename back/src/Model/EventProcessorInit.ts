import crypto from "crypto";
import { WebRtcSignalToClientMessage } from "@workadventure/messages";
import { TURN_STATIC_AUTH_SECRET } from "../Enum/EnvironmentVariable";
import { EventProcessor } from "./EventProcessor";
import { webRTCCredentialsService } from "./Services/WebRTCCredentialsService";

export const eventProcessor = new EventProcessor();

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
        const { webRtcUserName: username, webRtcPassword: password } = webRTCCredentialsService.generateCredentials(
            crypto.createHash("md5").update(receiverId).digest("hex")
        );

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
            const { webRtcUserName: username, webRtcPassword: password } = webRTCCredentialsService.generateCredentials(
                crypto.createHash("md5").update(receiverId).digest("hex")
            );
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

eventProcessor.registerPublicEventProcessor("spaceMessage", (event, senderId, users) => {
    if (event.$case !== "spaceMessage") {
        // FIXME: improve the typing of the method to avoid this
        throw new Error("Invalid event type");
    }

    const sender = users.find((user) => user.spaceUserId === senderId);

    if (!sender) {
        throw new Error("Sender not found");
    }

    return {
        $case: "spaceMessage",
        spaceMessage: {
            message: event.spaceMessage.message,
            characterTextures: sender.characterTextures,
            name: sender.name,
        },
    };
});

eventProcessor.registerPublicEventProcessor("spaceIsTyping", (event, senderId, users) => {
    if (event.$case !== "spaceIsTyping") {
        // FIXME: improve the typing of the method to avoid this
        throw new Error("Invalid event type");
    }

    const sender = users.find((user) => user.spaceUserId === senderId);

    if (!sender) {
        throw new Error("Sender not found");
    }

    return {
        $case: "spaceIsTyping",
        spaceIsTyping: {
            isTyping: event.spaceIsTyping.isTyping,
            characterTextures: sender.characterTextures,
            name: sender.name,
        },
    };
});
