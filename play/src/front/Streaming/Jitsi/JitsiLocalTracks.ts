import JitsiLocalTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiLocalTrack";

export interface JitsiLocalTracks {
    video: JitsiLocalTrack | undefined;
    audio: JitsiLocalTrack | undefined;
    screenSharing: JitsiLocalTrack | undefined;
}
