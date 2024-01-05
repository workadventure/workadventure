import { Readable } from "svelte/store";
import { TrackInterface } from "./TrackInterface";

export interface TrackStreamWrapperInterface {
    get uniqueId(): string;

    get videoTrackStore(): Readable<TrackInterface | undefined>;

    get audioTrackStore(): Readable<TrackInterface | undefined>;

    getVideoTrack(): TrackInterface | undefined;

    getAudioTrack(): TrackInterface | undefined;

    setAudioTrack(audioTrack: TrackInterface | undefined): void;

    setVideoTrack(videoTrack: TrackInterface | undefined): void;

    isEmpty(): boolean;

    isLocal(): boolean;

    muteAudioParticipant(): void;

    muteAudioEveryBody(): void;

    muteVideoParticipant(): void;

    muteVideoEverybody(): void;

    kickoff(): void;

    blockOrReportUser(): void;
}
