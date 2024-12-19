import { get, Readable, writable, Writable } from "svelte/store";
import type JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";
import { SpaceUserExtended } from "../../Space/SpaceFilter/SpaceFilter";
import { JitsiTrackWrapper } from "./JitsiTrackWrapper";

export interface JitsiTrackExt extends JitsiTrack {
    mute(): void;
    unmute(): void;
}

/**
 * An object that wraps a JitsiTrackWrapper and points only to "video/audio" or "desktop" track
 */
export class JitsiTrackStreamWrapper {
    //public readonly uniqueId: string;
    private readonly _audioTrackStore: Writable<JitsiTrack | JitsiTrackExt | undefined> = writable<
        JitsiTrack | JitsiTrackExt | undefined
    >(undefined);
    private readonly _videoTrackStore: Writable<JitsiTrack | JitsiTrackExt | undefined> = writable<
        JitsiTrack | JitsiTrackExt | undefined
    >(undefined);

    constructor(
        public readonly jitsiTrackWrapper: JitsiTrackWrapper,
        public readonly target: "video/audio" | "desktop"
    ) {
        //this.uniqueId = `${target}-${jitsiTrackWrapper.uniqueId}`;
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
}
