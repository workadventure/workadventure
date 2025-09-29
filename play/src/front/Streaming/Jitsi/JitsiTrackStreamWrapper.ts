import { derived, get, Readable, writable, Writable } from "svelte/store";
import type JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";
import * as Sentry from "@sentry/svelte";
import { ForwardableStore } from "@workadventure/store-utils";
import {
    JitsiTrackStreamable,
    MediaStoreStreamable,
    SCREEN_SHARE_STARTING_PRIORITY,
    Streamable,
    VIDEO_STARTING_PRIORITY,
} from "../../Stores/StreamableCollectionStore";
import { PeerStatus } from "../../WebRtc/VideoPeer";
import { SpaceUserExtended } from "../../Space/SpaceInterface";
import { JitsiTrackWrapper } from "./JitsiTrackWrapper";

export interface JitsiTrackExt extends JitsiTrack {
    mute(): void;

    unmute(): void;
}

/**
 * An object that wraps a JitsiTrackWrapper and points only to "video/audio" or "desktop" track
 */
export class JitsiTrackStreamWrapper implements Streamable {
    //public readonly uniqueId: string;
    private readonly _audioTrackStore: Writable<JitsiTrack | JitsiTrackExt | undefined> = writable<
        JitsiTrack | JitsiTrackExt | undefined
    >(undefined);
    private readonly _videoTrackStore: Writable<JitsiTrack | JitsiTrackExt | undefined> = writable<
        JitsiTrack | JitsiTrackExt | undefined
    >(undefined);
    private readonly showVoiceIndicatorStore: ForwardableStore<boolean> = new ForwardableStore<boolean>(false);
    private readonly nameStore: ForwardableStore<string> = new ForwardableStore<string>("");
    private readonly _pictureStore: Writable<string | undefined> = writable<string | undefined>(undefined);
    public flipX = false;
    public muteAudio = false;
    public readonly displayMode: "fit" | "cover";
    public readonly displayInPictureInPictureMode = true;
    public readonly usePresentationMode = false;
    public priority: number;
    public lastSpeakTimestamp?: number;
    constructor(
        public readonly jitsiTrackWrapper: JitsiTrackWrapper,
        public readonly target: "video/audio" | "desktop"
    ) {
        if (target === "video/audio") {
            this.displayMode = "cover";
            this.priority = VIDEO_STARTING_PRIORITY;
        } else {
            this.displayMode = "fit";
            this.priority = SCREEN_SHARE_STARTING_PRIORITY;
        }
        //this.uniqueId = `${target}-${jitsiTrackWrapper.uniqueId}`;
        this.getExtendedSpaceUser()
            .then((spaceUser) => {
                this.showVoiceIndicatorStore.forward(spaceUser.reactiveUser.showVoiceIndicator);
                this.nameStore.forward(spaceUser.reactiveUser.name);
                this._pictureStore.set(spaceUser.getWokaBase64);
            })
            .catch((e) => {
                console.error("Error while getting extended space user", e);
                Sentry.captureException(e);
            });
    }

    get uniqueId(): string {
        return `${this.target}-${this.jitsiTrackWrapper.uniqueId}`;
    }

    get videoTrackStore(): Readable<JitsiTrack | undefined> {
        return this._videoTrackStore;
    }

    get audioTrackStore(): Readable<JitsiTrack | undefined> {
        return this._audioTrackStore;
    }

    public getVideoTrack(): JitsiTrack | JitsiTrackExt | undefined {
        return get(this._videoTrackStore);
    }

    public getAudioTrack(): JitsiTrack | undefined {
        return get(this._audioTrackStore);
    }

    public setAudioTrack(jitsiTrack: JitsiTrack | JitsiTrackExt | undefined) {
        this._audioTrackStore.set(jitsiTrack);
    }

    public setVideoTrack(jitsiTrack: JitsiTrack | JitsiTrackExt | undefined) {
        this._videoTrackStore.set(jitsiTrack);
    }

    public isEmpty(): boolean {
        return !this.getVideoTrack() && !this.getAudioTrack();
    }

    public isLocal(): boolean {
        return this.jitsiTrackWrapper.isLocal;
    }

    public getExtendedSpaceUser(): Promise<SpaceUserExtended> {
        return this.jitsiTrackWrapper.spaceUser;
    }

    get media(): MediaStoreStreamable | JitsiTrackStreamable {
        /*return {
            type: "jitsiTrack",
            jitsiTrackStreamWrapper: this,
        };*/
        const streamStore = derived(
            [this._videoTrackStore, this._audioTrackStore],
            ([$videoTrackStore, $audioTrackStore]) => {
                const tracks = [];
                if ($videoTrackStore) {
                    tracks.push($videoTrackStore.getTrack());
                }
                if ($audioTrackStore) {
                    tracks.push($audioTrackStore.getTrack());
                }

                if (tracks.length === 0) {
                    return undefined;
                }

                return new MediaStream(tracks);
            }
        );

        // Use a closure to keep the videoElementUnsubscribers map private to this getter call
        const videoElementUnsubscribers = new Map<HTMLVideoElement, () => void>();
        const audioElementUnsubscribers = new Map<HTMLAudioElement, () => void>();
        return {
            type: "mediaStore",
            streamStore,
            attachVideo: (container: HTMLVideoElement) => {
                // If already attached, detach first to avoid leaks
                if (videoElementUnsubscribers.has(container)) {
                    const prevUnsub = videoElementUnsubscribers.get(container);
                    if (prevUnsub) prevUnsub();
                    videoElementUnsubscribers.delete(container);
                }
                const unsubscribe = this._videoTrackStore.subscribe((stream) => {
                    if (stream) {
                        container.srcObject = new MediaStream([stream.getTrack()]);
                    } else {
                        container.srcObject = null;
                    }
                });
                // In case of switch, we should be able to register the spaceUserId. Since we never switch to Jitsi though, we can do without.
                //this.space.spacePeerManager.registerVideoContainer(this.spaceUser.spaceUserId, container);
                videoElementUnsubscribers.set(container, unsubscribe);
            },
            attachAudio: (container: HTMLAudioElement) => {
                // If already attached, detach first to avoid leaks
                if (audioElementUnsubscribers.has(container)) {
                    const prevUnsub = audioElementUnsubscribers.get(container);
                    if (prevUnsub) prevUnsub();
                    audioElementUnsubscribers.delete(container);
                }
                const unsubscribe = this._audioTrackStore.subscribe((stream) => {
                    if (stream) {
                        container.srcObject = new MediaStream([stream.getTrack()]);
                    } else {
                        container.srcObject = null;
                    }
                });
                audioElementUnsubscribers.set(container, unsubscribe);
            },
            detachVideo: (container: HTMLVideoElement) => {
                // Call the unsubscribe function if it exists and remove it from the Map
                const unsubscribe = videoElementUnsubscribers.get(container);
                if (unsubscribe) {
                    unsubscribe();
                    videoElementUnsubscribers.delete(container);
                }
                container.srcObject = null;
            },
            detachAudio: (container: HTMLAudioElement) => {
                // Call the unsubscribe function if it exists and remove it from the Map
                const unsubscribe = audioElementUnsubscribers.get(container);
                if (unsubscribe) {
                    unsubscribe();
                    audioElementUnsubscribers.delete(container);
                }
                container.srcObject = null;
            },
        };
    }

    get volumeStore(): Readable<number[] | undefined> | undefined {
        return this.jitsiTrackWrapper.volumeStore;
    }

    get hasVideo(): Readable<boolean> {
        return derived(this._videoTrackStore, ($videoTrackStore) => {
            return $videoTrackStore !== undefined;
        });
    }

    get hasAudio(): Readable<boolean> {
        if (this.target === "desktop") {
            return writable(false);
        } else {
            return writable(true);
        }
    }

    get isMuted(): Readable<boolean> {
        return derived(this._audioTrackStore, ($audioTrackStore) => {
            return $audioTrackStore === undefined;
        });
    }

    get statusStore(): Readable<PeerStatus> {
        return writable("connected");
    }

    get name(): Readable<string> {
        return this.nameStore;
    }

    get showVoiceIndicator(): Readable<boolean> {
        return this.showVoiceIndicatorStore;
    }

    get pictureStore(): Readable<string | undefined> {
        return this._pictureStore;
    }

    once(event: string, callback: (...args: unknown[]) => void) {
        callback();
    }
}
