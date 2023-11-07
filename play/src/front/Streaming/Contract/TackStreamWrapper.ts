import { Readable } from "svelte/store";
import type JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";

export interface TackStreamWrapper {
    get uniqueId(): string;

    get videoTrackStore(): Readable<JitsiTrack | undefined>;

    get audioTrackStore(): Readable<JitsiTrack | undefined>;

    getVideoTrack(): JitsiTrack | undefined;

    getAudioTrack(): JitsiTrack | undefined;

    setAudioTrack(jitsiTrack: JitsiTrack | undefined): void;

    setVideoTrack(jitsiTrack: JitsiTrack | undefined): void;

    isEmpty(): boolean;

    isLocal(): boolean;

    muteAudio(): void;

    muteAudioEveryBody(): void;

    muteVideo(): void;

    muteVideoEverybody(): void;

    ban(): void;
}
