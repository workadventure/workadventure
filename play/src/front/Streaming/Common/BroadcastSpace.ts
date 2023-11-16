import { Readable } from "svelte/store";
import { Space } from "../../Space/Space";
import { TrackWrapper } from "./TrackWrapper";

/**
 *
 */
export interface BroadcastSpace {
    /**
     * Type of the broadcast space. For instance: "jitsi".
     */
    readonly provider: string;
    // TODO: replace "space" by "name" (the space should not be exposed)
    readonly space: Space;
    readonly tracks: Readable<Map<string, TrackWrapper>>;
    destroy(): void;
}
