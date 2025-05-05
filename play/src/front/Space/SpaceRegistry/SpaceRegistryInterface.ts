import { Readable } from "svelte/store";
import { VideoPeer } from "../../WebRtc/VideoPeer";
import { SpaceInterface } from "../SpaceInterface";
import { ScreenSharingPeer } from "../../WebRtc/ScreenSharingPeer";
import { Streamable } from "../../Stores/StreamableCollectionStore";
import { ExtendedStreamable } from "../../Livekit/LivekitParticipant";
export interface SpaceRegistryInterface {
    getAll(): SpaceInterface[];
    get(spaceName: string): SpaceInterface;
    joinSpace(spaceName: string, propertiesToSync: string[]): SpaceInterface;
    exist(spaceName: string): boolean;
    leaveSpace(space: SpaceInterface): void;
    destroy(): void;
    peerStore: Readable<Map<string, VideoPeer>>;
    screenSharingPeerStore: Readable<Map<string, ScreenSharingPeer>>;
    livekitVideoStreamStore: Readable<Map<string, ExtendedStreamable>>;
    livekitScreenShareStreamStore: Readable<Map<string, ExtendedStreamable>>;
}
