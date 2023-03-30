import JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";
import {Readable, Unsubscriber, writable, Writable} from "svelte/store";
import { SoundMeter } from "../../Phaser/Components/SoundMeter";
import {SpaceUserExtended} from "../../Space/Space";

export class JitsiTrackWrapper {
    private _spaceUser: SpaceUserExtended | undefined;
    private _audioTrack: JitsiTrack | undefined;
    private _videoTrack: JitsiTrack | undefined;
    private _volumeStore: Writable<number[] | undefined>;

    private soundMeter: SoundMeter | undefined;
    private timeout: NodeJS.Timeout | undefined;
    private volumeStoreSubscribe: Unsubscriber | undefined;

    constructor(jitsiTrack: JitsiTrack) {
        this.setJitsiTrack(jitsiTrack);
        this._volumeStore = writable<number[] | undefined>(undefined, set => {
            let error = false;
            if (this.timeout) {
                clearTimeout(this.timeout);
                this.timeout = undefined;
            }
            this.timeout = setInterval(() => {
                try {
                    if(this.soundMeter) {
                        set(this.soundMeter.getVolume());
                        console.log("Volume", this.soundMeter.getVolume());
                    }
                } catch (err) {
                    if (!error) {
                        console.error(err);
                        error = true;
                    }
                }
            }, 100);
        });
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
            console.log("new track is audio", {allowOverride: allowOverride});
            if (this._audioTrack !== undefined) {
                if (!allowOverride) {
                    throw new Error("An audio track is already defined");
                } else {
                    this._audioTrack.dispose();
                }
            }
            this._audioTrack = jitsiTrack;
            this.soundMeter = new SoundMeter(jitsiTrack.getOriginalStream());
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
        if (this.soundMeter) {
            this.soundMeter.stop();
            this.soundMeter = undefined;
        }
        console.log("JitsiTrackWrapper => Audio is muted, unsubscribe from volume store");
    }

    muteVideo() {
        this._videoTrack = undefined;
    }

    get spaceUser(): SpaceUserExtended | undefined {
        return this._spaceUser;
    }

    set spaceUser(value: SpaceUserExtended | undefined) {
        this._spaceUser = value;
    }

    get volumeStore(): Readable<number[] | undefined> | undefined {
        return this._volumeStore;
    }

    unsubscribe() {
        this.volumeStoreSubscribe?.();
        this._volumeStore?.set(undefined);
        if (this.soundMeter) {
            this.soundMeter.stop();
        }
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }
    }
}
