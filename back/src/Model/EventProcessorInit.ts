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
            senderId.toString()
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
                senderId.toString()
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

eventProcessor.registerPublicEventProcessor("startRecordingMessage", async (event, senderId, space) => {
    if (event.$case !== "startRecordingMessage") {
        throw new Error("Invalid event type");
    }
    const spaceUser = space.getUser(senderId);
    if (!spaceUser) {
        console.error("Could not find space user to start recording");
        throw new Error("Space user not found for start recording event");
    }
    if (!event.startRecordingMessage.userUuid) {
        console.error("No userUuid provided in startRecordingMessage");
        throw new Error("No userUuid provided in startRecordingMessage");
    }

    try {
        await space.startRecording(spaceUser, event.startRecordingMessage.userUuid);

        space.dispatchPrivateEvent({
            spaceName: space.getSpaceName(),
            senderUserId: senderId,
            receiverUserId: senderId,
            spaceEvent: {
                event: {
                    $case: "startRecordingResultMessage",
                    startRecordingResultMessage: {
                        success: true,
                    },
                },
            },
        });

        return {
            $case: "startRecordingMessage",
            startRecordingMessage: {},
        };
    } catch (error) {
        space.dispatchPrivateEvent({
            spaceName: space.getSpaceName(),
            senderUserId: senderId, // 0 means that the event is sent by the server
            receiverUserId: senderId,
            spaceEvent: {
                event: {
                    $case: "startRecordingResultMessage",
                    startRecordingResultMessage: {
                        success: false,
                    },
                },
            },
        });
        throw error;
    }
});

eventProcessor.registerPublicEventProcessor("stopRecordingMessage", async (event, senderId, space) => {
    if (event.$case !== "stopRecordingMessage") {
        throw new Error("Invalid event type");
    }
    const spaceUser = space.getUser(senderId);
    if (!spaceUser) {
        console.trace("Could not find space user to stop recording");
        throw new Error("Space user not found for stop recording event");
    }

    try {
        await space.stopRecording(spaceUser);
        space.dispatchPrivateEvent({
            spaceName: space.getSpaceName(),
            senderUserId: senderId,
            receiverUserId: senderId,
            spaceEvent: {
                event: {
                    $case: "stopRecordingResultMessage",
                    stopRecordingResultMessage: {
                        success: true,
                    },
                },
            },
        });
        return {
            $case: "stopRecordingMessage",
            stopRecordingMessage: {},
        };
    } catch (error) {
        space.dispatchPrivateEvent({
            spaceName: space.getSpaceName(),
            senderUserId: senderId,
            receiverUserId: senderId,
            spaceEvent: {
                event: {
                    $case: "stopRecordingResultMessage",
                    stopRecordingResultMessage: {
                        success: false,
                        errorMessage: "Error while stopping recording",
                    },
                },
            },
        });
        throw error;
    }
});
