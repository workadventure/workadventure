// eslint-disable-next-line import/no-unresolved
import JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";
import { Readable, Unsubscriber, writable, Writable, readable } from "svelte/store";
import { Subscription } from "rxjs";
import { SoundMeter } from "../../Phaser/Components/SoundMeter";
import { SpaceUserExtended } from "../../Space/Space";
import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
import { TrackWrapper } from "../Common/TrackWrapper";
import { JitsiTrackStreamWrapper } from "./JitsiTrackStreamWrapper";

export class JitsiTrackWrapper implements TrackWrapper {
    private _spaceUser: SpaceUserExtended | undefined;
    public readonly cameraTrackWrapper: JitsiTrackStreamWrapper = new JitsiTrackStreamWrapper(this, "video/audio");
    public readonly screenSharingTrackWrapper: JitsiTrackStreamWrapper = new JitsiTrackStreamWrapper(this, "desktop");
    private _audioStreamStore: Writable<MediaStream | null> = writable<MediaStream | null>(null);
    private readonly _volumeStore: Readable<number[] | undefined> | undefined;
    private volumeStoreSubscribe: Unsubscriber | undefined;
    private spaceUserUpdateSubscribe: Subscription | undefined;
    public readonly isLocal: boolean;

    constructor(readonly participantId: string, jitsiTrack: JitsiTrack | undefined) {
        if (jitsiTrack) {
            this.setJitsiTrack(jitsiTrack);
            this.isLocal = jitsiTrack.isLocal();
        } else {
            this.isLocal = false;
        }
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
        // Let's start by suppressing any "echo". setJitsiTrack can be called multiple times for the same track
        // For some reason, Jitsi can trigger the remoteTrack event several times.
        console.log(
            "this.cameraTrackWrapper.getVideoTrack()?.getTrack().getSettings() === jitsiTrack.getTrack().getSettings()",
            this.cameraTrackWrapper.getVideoTrack()?.getTrack().getSettings() === jitsiTrack.getTrack().getSettings()
        );
        if (
            this.cameraTrackWrapper.getAudioTrack() === jitsiTrack ||
            this.cameraTrackWrapper.getVideoTrack() === jitsiTrack ||
            this.screenSharingTrackWrapper.getVideoTrack() === jitsiTrack ||
            this.screenSharingTrackWrapper.getAudioTrack() === jitsiTrack ||
            this.cameraTrackWrapper.getVideoTrack()?.getTrack().getSettings() === jitsiTrack.getTrack().getSettings()
        ) {
            return;
        }

        if (jitsiTrack.isAudioTrack()) {
            const oldAudioTrack = this.cameraTrackWrapper.getAudioTrack();
            if (oldAudioTrack !== undefined) {
                if (!allowOverride) {
                    throw new Error("An audio track is already defined");
                } else {
                    oldAudioTrack.dispose();
                }
            }
            this.cameraTrackWrapper.setAudioTrack(jitsiTrack);

            this._audioStreamStore.set(jitsiTrack.getOriginalStream());
        } else if (jitsiTrack.isVideoTrack()) {
            // The jitsiTrack.getVideoType() return is a lie.
            // Because it comes from Jitsi signaling, it is first evaluated to "video" and can AFTER be changed to "desktop"

            if (jitsiTrack.getVideoType() === "desktop") {
                const oldScreenSharingTrack = this.screenSharingTrackWrapper.getVideoTrack();
                if (oldScreenSharingTrack !== undefined) {
                    if (!allowOverride) {
                        throw new Error("A screenSharing track is already defined");
                    } else {
                        oldScreenSharingTrack?.dispose();
                    }
                }
                this.screenSharingTrackWrapper.setVideoTrack(jitsiTrack);

                // Let's notify the embedded store that a new screen-sharing has started
                this.highlightScreenSharing();
            } else {
                const oldVideoTrack = this.cameraTrackWrapper.getVideoTrack();
                if (oldVideoTrack !== undefined) {
                    if (!allowOverride) {
                        // The jitsiTrack.getVideoType() return is a lie.
                        // Because it comes from Jitsi signaling, it is first evaluated to "video" and can AFTER be changed to "desktop"
                        // So if we land here, it is possible that the video type is "desktop" and not "video"!!!!!
                        const oldScreenSharingVideoTrack = this.screenSharingTrackWrapper.getVideoTrack();
                        if (oldScreenSharingVideoTrack !== undefined) {
                            throw new Error("A video track is already defined");
                        }
                        this.screenSharingTrackWrapper.setVideoTrack(jitsiTrack);

                        // Let's notify the embedded store that a new screen-sharing has started
                        this.highlightScreenSharing();
                    } else {
                        oldVideoTrack?.dispose();
                    }
                }
                if (this.screenSharingTrackWrapper.getVideoTrack() !== jitsiTrack) {
                    this.cameraTrackWrapper.setVideoTrack(jitsiTrack);
                }
                // The video track might be a lie! It is maybe a screen sharing track
                // We need to check the video type after a few seconds and switch the track to "screen sharing" if needed
                setTimeout(() => {
                    // TODO: IF A SWITCH IS MADE HERE, THE StreamableCollectionStore will probably not be notified!

                    if (
                        this.cameraTrackWrapper.getVideoTrack() === jitsiTrack &&
                        jitsiTrack.getVideoType() === "desktop"
                    ) {
                        const oldScreenSharingTrack = this.screenSharingTrackWrapper.getVideoTrack();
                        if (oldScreenSharingTrack !== undefined) {
                            if (!allowOverride) {
                                throw new Error("A screenSharing track is already defined");
                            } else {
                                oldScreenSharingTrack?.dispose();
                            }
                        }
                        console.log("Switching camera track to screen sharing track");
                        this.screenSharingTrackWrapper.setVideoTrack(jitsiTrack);
                        this.cameraTrackWrapper.setVideoTrack(undefined);

                        // Let's notify the embedded store that a new screen-sharing has started
                        this.highlightScreenSharing();
                    }
                }, 5000);
            }
        } else {
            throw new Error("Jitsi Track is neither audio nor video");
        }
    }

    muteAudio() {
        this.cameraTrackWrapper.setAudioTrack(undefined);
        this._audioStreamStore.set(null);
    }

    muteVideo() {
        this.cameraTrackWrapper.setVideoTrack(undefined);
    }

    muteScreenSharing() {
        this.screenSharingTrackWrapper.setVideoTrack(undefined);
    }

    get spaceUser(): SpaceUserExtended | undefined {
        return this._spaceUser;
    }

    set spaceUser(value: SpaceUserExtended | undefined) {
        this._spaceUser = value;
        this.spaceUserUpdateSubscribe = this._spaceUser?.updateSubject.subscribe((event) => {
            if (event.changes.screenSharingState) {
                // This is the only reliable way to know if the screen sharing is active or not
                // Indeed, if the user stops the screen sharing using the "Stop sharing" button in the OS, the screen sharing track is not removed
                // When the user starts the screen sharing again, the track is not replaced and therefore, we cannot put the screen sharing track in full screen again.
                // With this trick, we can force the screen sharing to go full screen again.

                // Let's notify the embedded store that a new screen-sharing has started
                this.highlightScreenSharing();
            }
        });
    }

    private highlightScreenSharing(): void {
        if (this.isLocal) {
            // Never highlight our own screen sharing
            return;
        }
        // Let's notify the embedded store that a new screen-sharing has started
        highlightedEmbedScreen.highlight({
            type: "streamable",
            embed: this.screenSharingTrackWrapper,
        });
    }

    get volumeStore(): Readable<number[] | undefined> | undefined {
        return this._volumeStore;
    }

    unsubscribe() {
        this.cameraTrackWrapper.setVideoTrack(undefined);
        this.cameraTrackWrapper.setAudioTrack(undefined);
        this.screenSharingTrackWrapper.setVideoTrack(undefined);
        this.screenSharingTrackWrapper.setAudioTrack(undefined);
        this._audioStreamStore.set(null);
        this.spaceUserUpdateSubscribe?.unsubscribe();
        this._spaceUser = undefined;
    }

    public isEmpty(): boolean {
        return this.cameraTrackWrapper.isEmpty() && this.screenSharingTrackWrapper.isEmpty();
    }
}
