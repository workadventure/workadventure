import { get, Readable, writable, Writable } from "svelte/store";
import type JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";
import { TackStreamWrapper } from "../Contract/TackStreamWrapper";
import { JitsiTrackWrapper } from "./JitsiTrackWrapper";
import { jitsiConferencesStore } from "./JitsiConferencesStore";
/**
 * An object that wraps a JitsiTrackWrapper and points only to "video/audio" or "desktop" track
 */
export class JitsiTrackStreamWrapper implements TackStreamWrapper {
    //public readonly uniqueId: string;
    private readonly _audioTrackStore: Writable<JitsiTrack | undefined> = writable<JitsiTrack | undefined>(undefined);
    private readonly _videoTrackStore: Writable<JitsiTrack | undefined> = writable<JitsiTrack | undefined>(undefined);

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

    public getVideoTrack(): JitsiTrack | undefined {
        return get(this._videoTrackStore);
    }

    public getAudioTrack(): JitsiTrack | undefined {
        return get(this._audioTrackStore);
    }

    public setAudioTrack(jitsiTrack: JitsiTrack | undefined) {
        this._audioTrackStore.set(jitsiTrack);
    }

    public setVideoTrack(jitsiTrack: JitsiTrack | undefined) {
        this._videoTrackStore.set(jitsiTrack);
    }

    public isEmpty(): boolean {
        return !this.getVideoTrack() && !this.getAudioTrack();
    }

    public isLocal(): boolean {
        return this.jitsiTrackWrapper.isLocal;
    }

    public muteAudio(): void {
        this.jitsiTrackWrapper.muteAudio();
    }

    public muteAudioEveryBody(): void {
        console.info("Not implemented yet!");
    }

    public muteVideo(): void {
        this.jitsiTrackWrapper.muteVideo();
    }

    public muteVideoEverybody(): void {
        console.info("Not implemented yet!");
    }

    public ban(): void {
        console.info("Not implemented yet!");
        jitsiConferencesStore
            .get(this.jitsiTrackWrapper.jitsiRoomName)
            ?.kickParticipant(this.jitsiTrackWrapper.participantId);
    }
}
