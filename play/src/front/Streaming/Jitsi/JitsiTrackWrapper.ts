import JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";
import { Readable, Unsubscriber, writable, Writable, readable, get } from "svelte/store";
import { v4 as uuid } from "uuid";
import { SoundMeter } from "../../Phaser/Components/SoundMeter";
import { SpaceUserExtended } from "../../Space/Space";

export class JitsiTrackWrapper {
    private _spaceUser: SpaceUserExtended | undefined;
    private _audioTrack: Writable<JitsiTrack | undefined> = writable<JitsiTrack | undefined>(undefined);
    private _videoTrack: Writable<JitsiTrack | undefined> = writable<JitsiTrack | undefined>(undefined);
    private _audioStreamStore: Writable<MediaStream | null> = writable<MediaStream | null>(null);
    private _volumeStore: Readable<number[] | undefined> | undefined;
    private volumeStoreSubscribe: Unsubscriber | undefined;

    constructor(readonly participantId: string, jitsiTrack: JitsiTrack) {
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
                if (timeout) {
                    clearTimeout(timeout);
                }
                if (mediaStream === null || mediaStream.getAudioTracks().length <= 0) {
                    set(undefined);
                    return;
                }
                soundMeter = new SoundMeter(mediaStream);
                let error = false;

                timeout = setInterval(() => {
                    try {
                        set(soundMeter?.getVolume());
                        //console.log("Volume", soundMeter?.getVolume());
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
        return this.participantId;
        // FIXME: What is following should not be necessary, a track must be set by a participant, so he definitely has a participantId that is set when he is instantiated

        //@ts-ignore
        const trackId = get(this._videoTrack)?.getParticipantId() ?? get(this._audioTrack)?.getParticipantId();
        if (!trackId) {
            //throw new Error("Jitsi Track has no ID");
            return uuid();
        }
        return trackId;
    }

    setJitsiTrack(jitsiTrack: JitsiTrack, allowOverride = false) {
        if (jitsiTrack.isAudioTrack()) {
            console.log("new track is audio", { allowOverride: allowOverride });
            if (get(this._audioTrack) !== undefined) {
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
            if (get(this._videoTrack) !== undefined) {
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
        this._audioTrack.set(undefined);
        this._videoTrack.set(undefined);
        this._audioStreamStore.set(null);
        this._spaceUser = undefined;
    }
}
