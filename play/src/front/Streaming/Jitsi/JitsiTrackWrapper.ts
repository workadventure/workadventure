// eslint-disable-next-line import/no-unresolved
import JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";
import { Readable, Unsubscriber, writable, Writable, readable, get } from "svelte/store";
import { SoundMeter } from "../../Phaser/Components/SoundMeter";
import { SpaceUserExtended } from "../../Space/Space";

export class JitsiTrackWrapper {
    private _spaceUser: SpaceUserExtended | undefined;
    private _audioTrack: Writable<JitsiTrack | undefined> = writable<JitsiTrack | undefined>(undefined);
    private _videoTrack: Writable<JitsiTrack | undefined> = writable<JitsiTrack | undefined>(undefined);
    private _screenSharingTrack: Writable<JitsiTrack | undefined> = writable<JitsiTrack | undefined>(undefined);
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
    }

    setJitsiTrack(jitsiTrack: JitsiTrack, allowOverride = false) {
        if (jitsiTrack.isAudioTrack()) {
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
            // The jitsiTrack.getVideoType() return is a lie.
            // Because it comes from Jitsi signaling, it is first evaluated to "video" and can AFTER be changed to "desktop"

            if (jitsiTrack.getVideoType() === "desktop") {
                if (get(this._screenSharingTrack) !== undefined) {
                    if (!allowOverride) {
                        throw new Error("A screenSharing track is already defined");
                    } else {
                        get(this._screenSharingTrack)?.dispose();
                    }
                }
                this._screenSharingTrack.set(jitsiTrack);
            } else {
                if (get(this._videoTrack) !== undefined) {
                    if (!allowOverride) {
                        // The jitsiTrack.getVideoType() return is a lie.
                        // Because it comes from Jitsi signaling, it is first evaluated to "video" and can AFTER be changed to "desktop"
                        // So if we land here, is is possible that the video type is "desktop" and not "video"!!!!!
                        if (get(this._screenSharingTrack) !== undefined) {
                            throw new Error("A video track is already defined");
                        }
                        this._screenSharingTrack.set(jitsiTrack);
                    } else {
                        get(this._videoTrack)?.dispose();
                    }
                }
                if (get(this._screenSharingTrack) !== jitsiTrack) {
                    this._videoTrack.set(jitsiTrack);
                }
                // The video track might be a lie! It is maybe a screen sharing track
                // We need to check the video type after a few seconds and switch the track to "screen sharing" if needed
                setTimeout(() => {
                    if (get(this._videoTrack) === jitsiTrack && jitsiTrack.getVideoType() === "desktop") {
                        if (get(this._screenSharingTrack) !== undefined) {
                            if (!allowOverride) {
                                throw new Error("A screenSharing track is already defined");
                            } else {
                                get(this._screenSharingTrack)?.dispose();
                            }
                        }
                        this._screenSharingTrack.set(jitsiTrack);
                        this._videoTrack.set(undefined);
                    }
                }, 5000);
            }
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

    get screenSharingTrack(): Readable<JitsiTrack | undefined> {
        return this._screenSharingTrack;
    }

    muteAudio() {
        this._audioTrack.set(undefined);
        this._audioStreamStore.set(null);
    }

    muteVideo() {
        this._videoTrack.set(undefined);
    }

    muteScreenSharing() {
        this._screenSharingTrack.set(undefined);
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
        this._screenSharingTrack.set(undefined);
        this._audioStreamStore.set(null);
        this._spaceUser = undefined;
    }
}
