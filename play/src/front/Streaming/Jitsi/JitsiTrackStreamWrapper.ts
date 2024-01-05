import { get, Readable, writable, Writable } from "svelte/store";
import type JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";
import { TrackStreamWrapperInterface } from "../Contract/TrackStreamWrapperInterface";
import { JitsiTrackWrapper } from "./JitsiTrackWrapper";
/**
 * An object that wraps a JitsiTrackWrapper and points only to "video/audio" or "desktop" track
 */
export class JitsiTrackStreamWrapper implements TrackStreamWrapperInterface {
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

    public muteAudioParticipant(): void {
        this.jitsiTrackWrapper.muteMicrophonePartcipant();
    }

    public muteAudioEveryBody(): void {
        this.jitsiTrackWrapper.muteMicrophoneEverybody();
    }

    public muteVideoParticipant(): void {
        this.jitsiTrackWrapper.muteVideoParticipant();
    }

    public muteVideoEverybody(): void {
        this.jitsiTrackWrapper.muteVideoEverybody();
    }

    public kickoff(): void {
        this.jitsiTrackWrapper.kickoff();
    }

    public blockOrReportUser(): void {
        console.info("Not implemented yet!");
    }
}
