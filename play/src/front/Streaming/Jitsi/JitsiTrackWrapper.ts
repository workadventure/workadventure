import JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";

export class JitsiTrackWrapper {
    private _audioTrack: JitsiTrack | undefined;
    private _videoTrack: JitsiTrack | undefined;

    constructor(jitsiTrack: JitsiTrack) {
        this.setJitsiTrack(jitsiTrack);
    }

    get uniqueId(): string {
        //@ts-ignore
        const trackId = this.videoTrack?.getParticipantId() ?? this.audioTrack?.getParticipantId();
        if (!trackId) {
            throw new Error("Jitsi Track has no ID");
        }
        return trackId;
    }

    setJitsiTrack(jitsiTrack: JitsiTrack) {
        if (jitsiTrack.isAudioTrack()) {
            if (this._audioTrack !== undefined) {
                throw new Error("An audio track is already defined");
            }
            this._audioTrack = jitsiTrack;
        } else if (jitsiTrack.isVideoTrack()) {
            if (this._videoTrack !== undefined) {
                throw new Error("A video track is already defined");
            }
            this._videoTrack = jitsiTrack;
        } else {
            throw new Error("Jitsi Track is neither audio nor video");
        }
    }

    get videoTrack(): JitsiTrack | undefined {
        return this._videoTrack;
    }

    get audioTrack(): JitsiTrack | undefined {
        return this._audioTrack;
    }

    muteAudio() {
        this._audioTrack = undefined;
    }

    muteVideo() {
        this._videoTrack = undefined;
    }
}
