import JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";
import { Readable, Unsubscriber, writable, Writable, readable, get } from "svelte/store";
import { SoundMeter } from "../../Phaser/Components/SoundMeter";
import { SpaceUserExtended } from "../../Space/Space";

export class JitsiTrackWrapper {
    private _spaceUser: SpaceUserExtended | undefined;
    private _audioTrack: Writable<JitsiTrack | undefined> = writable<JitsiTrack | undefined>(undefined);
    private _videoTrack: Writable<JitsiTrack | undefined> = writable<JitsiTrack | undefined>(undefined);
    private _audioStreamStore: Writable<MediaStream | null> = writable<MediaStream | null>(null);
    private _volumeStore: Readable<number[] | undefined> | undefined;
    private volumeStoreSubscribe: Unsubscriber | undefined;

    constructor(jitsiTrack: JitsiTrack) {
        this.setJitsiTrack(jitsiTrack);
        this._volumeStore = readable<number[] | undefined>(undefined, (set) => {
            if (this.volumeStoreSubscribe) {
                this.volumeStoreSubscribe();
            }
            let soundMeter: SoundMeter;
            let timeout: NodeJS.Timeout;

            this.volumeStoreSubscribe = this._audioStreamStore.subscribe((mediaStream) => {
                if (soundMeter) {
                    soundMeter.stop();
                }
                if (mediaStream === null || mediaStream.getAudioTracks().length <= 0) {
                    set(undefined);
                    return;
                }
                soundMeter = new SoundMeter(mediaStream);
                let error = false;

                if (timeout) {
                    clearTimeout(timeout);
                }
                timeout = setInterval(() => {
                    try {
                        set(soundMeter?.getVolume());
                        console.log("Volume", soundMeter?.getVolume());
                    } catch (err) {
                        if (!error) {
                            console.error(err);
                            error = true;
                        }
                    }
                }, 100);
            });

            return () => {
                set(undefined);
                if (soundMeter) {
                    soundMeter.stop();
                }
                if (timeout) {
                    clearTimeout(timeout);
                }
            };
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
            console.log("new track is audio", { allowOverride: allowOverride });
            if (this._audioTrack !== undefined) {
                if (!allowOverride) {
                    throw new Error("An audio track is already defined");
                } else {
                    get(this._audioTrack)?.dispose();
                }
            }
            this._audioTrack.set(jitsiTrack);
            //this.soundMeter = new SoundMeter(jitsiTrack.getOriginalStream());

            this._audioStreamStore.set(jitsiTrack.getOriginalStream());
        } else if (jitsiTrack.isVideoTrack()) {
            if (this._videoTrack !== undefined) {
                if (!allowOverride) {
                    throw new Error("A video track is already defined");
                } else {
                    get(this._videoTrack)?.dispose();
                }
            }
            this._videoTrack.set(jitsiTrack);
        } else {
            throw new Error("Jitsi Track is neither audio nor video");
        }
    }

    get videoTrack(): Readable<JitsiTrack | undefined> {
        return this._videoTrack;
    }

    get audioTrack(): Readable<JitsiTrack | undefined> {
        return this._audioTrack;
    }

    muteAudio() {
        this._audioTrack.set(undefined);
        this._audioStreamStore.set(null);
        console.log("JitsiTrackWrapper => Audio is muted, unsubscribe from volume store");
    }

    muteVideo() {
        this._videoTrack.set(undefined);
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
        this._audioStreamStore.set(null);
    }
}
