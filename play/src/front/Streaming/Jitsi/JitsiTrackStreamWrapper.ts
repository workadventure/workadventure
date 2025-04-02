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
    private readonly nameStore: ForwardableStore<string> = new ForwardableStore<string>("");
    private readonly _pictureStore: Writable<string | undefined> = writable<string | undefined>(undefined);
    public flipX = false;
    public muteAudio = false;
    public readonly displayMode: "fit" | "cover";
    public readonly displayInPictureInPictureMode = true;

    constructor(
        public readonly jitsiTrackWrapper: JitsiTrackWrapper,
        public readonly target: "video/audio" | "desktop"
    ) {
        if (target === "video/audio") {
            this.displayMode = "cover";
        } else {
            this.displayMode = "fit";
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
        return {
            type: "mediaStore",
            streamStore: derived(
                [this._videoTrackStore, this._audioTrackStore],
                ([$videoTrackStore, $audioTrackStore]) => {
                    // We are recreating a MediaStream from the 2 separate tracks received.
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

    get name(): Readable<string> {
        return this.nameStore;
    }

    get showVoiceIndicator(): Readable<boolean> {
        return this.showVoiceIndicatorStore;
    }

    get pictureStore(): Readable<string | undefined> {
        return this._pictureStore;
    }
}
