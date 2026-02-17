import type { Readable, Writable } from "svelte/store";
import type { PeerStatus } from "../WebRtc/RemotePeer";
import type { WebRtcStats } from "../Components/Video/WebRtcStats";
import type {
    LivekitStreamable,
    ScriptingVideoStreamable,
    StreamCategory,
    WebRtcStreamable,
} from "../Stores/StreamableCollectionStore";

export interface Streamable {
    readonly uniqueId: string;
    readonly media: LivekitStreamable | WebRtcStreamable | ScriptingVideoStreamable;
    readonly volumeStore: Readable<number[] | undefined> | undefined;
    readonly hasVideo: Readable<boolean>;
    readonly hasAudio: Readable<boolean>;
    readonly isMuted: Readable<boolean>;
    readonly statusStore: Readable<PeerStatus>;
    readonly name: Readable<string>;
    readonly showVoiceIndicator: Readable<boolean>;
    readonly flipX: boolean;
    // If set to true, the video will be muted (no sound will come out, even if the underlying stream has an audio track attached).
    // This does not prevent the volume bar from being displayed.
    // We use this for local camera feedback or for seeAttendees feature (listeners are muted).
    readonly muteAudio: Writable<boolean>;
    // In fit mode, the video will fit into the container and be fully visible, even if it does not fill the full container
    // In cover mode, the video will cover the full container, even if it means that some parts of the video are not visible
    readonly displayMode: "fit" | "cover";
    readonly displayInPictureInPictureMode: boolean;
    readonly usePresentationMode: boolean;
    readonly spaceUserId: string | undefined;
    readonly closeStreamable: () => void;
    readonly volume: Writable<number>;
    readonly videoType: StreamCategory;
    readonly webrtcStats: Readable<WebRtcStats | undefined> | undefined;
}
