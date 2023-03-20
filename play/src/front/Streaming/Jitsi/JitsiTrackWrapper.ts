import { SpaceUser } from "@workadventure/messages";
import JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";
import { Readable, readable, Unsubscriber } from "svelte/store";
import { SoundMeter } from "../../Phaser/Components/SoundMeter";

export class JitsiTrackWrapper {
    private _spaceUser: SpaceUser | undefined;
    private _audioTrack: JitsiTrack | undefined;
    private _videoTrack: JitsiTrack | undefined;

    public userName = "test";
    private volumeStore: Readable<number[] | undefined> | undefined;
    private volumeStoreSubscribe: Unsubscriber | undefined;

    constructor(jitsiTrack: JitsiTrack) {
        this.setJitsiTrack(jitsiTrack);
        if (jitsiTrack.isAudioTrack()) {
            this.volumeStore = readable<number[] | undefined>(undefined, (set) => {
                if (this._audioTrack?.getOriginalStream()) {
                    const soundMeter = new SoundMeter(this._audioTrack.getOriginalStream());
                    let error = false;

                    setInterval(() => {
                        try {
                            set(soundMeter?.getVolume());
                        } catch (err) {
                            if (!error) {
                                console.error(err);
                                error = true;
                            }
                        }
                    }, 100);
                }
            });
        }
    }

    get uniqueId(): string {
        //@ts-ignore
        const trackId = this.videoTrack?.getParticipantId() ?? this.audioTrack?.getParticipantId();
        if (!trackId) {
            throw new Error("Jitsi Track has no ID");
        }
        return trackId;
    }

    setJitsiTrack(jitsiTrack: JitsiTrack, allowOverride = false) {
        if (jitsiTrack.isAudioTrack()) {
            if (this._audioTrack !== undefined) {
                if (!allowOverride) {
                    throw new Error("An audio track is already defined");
                } else {
                    this._audioTrack.dispose();
                }
            }
            this._audioTrack = jitsiTrack;
        } else if (jitsiTrack.isVideoTrack()) {
            if (this._videoTrack !== undefined) {
                if (!allowOverride) {
                    throw new Error("A video track is already defined");
                } else {
                    this._videoTrack.dispose();
                }
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

    get spaceUser(): SpaceUser | undefined {
        return this._spaceUser;
    }

    set spaceUser(value: SpaceUser | undefined) {
        this._spaceUser = value;
    }
}
