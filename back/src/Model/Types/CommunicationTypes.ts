export enum CommunicationType {
    NONE = "NONE",
    WEBRTC = "WEBRTC",
    LIVEKIT = "LIVEKIT",
}

export interface IWebRTCCredentials {
    webRtcUserName: string;
    webRtcPassword: string;
}
