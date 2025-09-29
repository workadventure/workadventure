export enum CommunicationType {
    NONE = "NONE",
    WEBRTC = "WEBRTC",
    LIVEKIT = "LIVEKIT",
}

export interface IWebRTCCredentials {
    webRtcUserName: string;
    webRtcPassword: string;
}

export interface ISwitchConfig {
    MAX_USERS_FOR_WEBRTC: number;
    SWITCH_TO_LIVEKIT_TIMEOUT_MS: number;
    SWITCH_TO_WEBRTC_TIMEOUT_MS: number;
    WEBRTC_RECONNECTION_WINDOW_MS: number;
}

export interface ICommunicationEvent {
    spaceName: string;
    receiverUserId: string;
    senderUserId: string;
    event: {
        $case: "prepareSwitchMessage" | "communicationStrategyMessage" | "executeSwitchMessage" | "webRtcStartMessage";
        [key: string]: unknown;
    };
}
