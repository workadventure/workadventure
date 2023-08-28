import { JitsiTrackWrapper } from "./JitsiTrackWrapper";

/**
 * An object that wraps a JitsiTrackWrapper and points only to "video/audio" or "desktop" track
 */
export class JitsiTrackStreamWrapper {
    public readonly uniqueId: string;

    constructor(
        public readonly jitsiTrackWrapper: JitsiTrackWrapper,
        public readonly target: "video/audio" | "desktop"
    ) {
        this.uniqueId = `${target}-${jitsiTrackWrapper.uniqueId}`;
        //this.userId = jitsiTrackWrapper.userId;
    }
}
