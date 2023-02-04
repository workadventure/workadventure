import JitsiLocalTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiLocalTrack";

export class JitsiLocalTracks {
    public constructor(tracks: JitsiLocalTrack[]) {
        for (const track of tracks) {
            if (track.isVideoTrack()) {
                this.video = track;
            } else if (track.isAudioTrack()) {
                this.audio = track;
            } else if (track.isScreenSharing()) {
                this.screenSharing = track;
            }
        }
    }

    public readonly video: JitsiLocalTrack | undefined;
    public readonly audio: JitsiLocalTrack | undefined;
    public readonly screenSharing: JitsiLocalTrack | undefined;
}
