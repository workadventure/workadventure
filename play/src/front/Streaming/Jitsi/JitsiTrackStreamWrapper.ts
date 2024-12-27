import { derived, get, Readable, writable, Writable } from "svelte/store";
import type JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";
import * as Sentry from "@sentry/svelte";
import { ForwardableStore } from "@workadventure/store-utils";
import { SpaceUserExtended } from "../../Space/SpaceFilter/SpaceFilter";
import { JitsiTrackStreamable, MediaStoreStreamable, Streamable } from "../../Stores/StreamableCollectionStore";
import { PeerStatus } from "../../WebRtc/VideoPeer";
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
    private readonly _pictureStore: Writable<string | undefined> = writable<string | undefined>(undefined);

    constructor(
        public readonly jitsiTrackWrapper: JitsiTrackWrapper,
        public readonly target: "video/audio" | "desktop"
    ) {
        //this.uniqueId = `${target}-${jitsiTrackWrapper.uniqueId}`;
        this.getExtendedSpaceUser()
            .then((spaceUser) => {
                this.showVoiceIndicatorStore.forward(spaceUser.reactiveUser.showVoiceIndicator);
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
        return {
            type: "mediaStore",
            streamStore: derived(
                [this._videoTrackStore, this._audioTrackStore],
                ([$videoTrackStore, $audioTrackStore]) => {
                    if ($videoTrackStore && $audioTrackStore) {
                        console.warn("JitsiTrackStreamWrapper => WARNING BOTH VIDEO AND AUDIO TRACKS ARE SET");
                    } else if ($videoTrackStore) {
                        console.log("JitsiTrackStreamWrapper => VIDEO TRACK IS SET");
                    } else if ($audioTrackStore) {
                        console.log("JitsiTrackStreamWrapper => AUDIO TRACK IS SET");
                    } else {
                        console.log("JitsiTrackStreamWrapper => NO TRACK IS SET");
                    }

                    return $videoTrackStore
                        ? $videoTrackStore.getOriginalStream()
                        : $audioTrackStore
                        ? $audioTrackStore.getOriginalStream()
                        : undefined;
                }
            ),
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

    get name(): string {
        return "FooChangeMe";
    }

    get showVoiceIndicator(): Readable<boolean> {
        return this.showVoiceIndicatorStore;
    }

    get pictureStore(): Readable<string | undefined> {
        return this._pictureStore;
    }
}
