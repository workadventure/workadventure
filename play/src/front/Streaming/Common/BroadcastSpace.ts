import { Readable } from "svelte/store";
import { Space } from "../../Space/SpaceWatcher/Space";
import { TrackWrapper } from "./TrackWrapper";

export interface BroadcastSpace {
    readonly provider: string;
    readonly space: Space;
    readonly tracks: Readable<Map<string, TrackWrapper>>;
    destroy(): void;
}
