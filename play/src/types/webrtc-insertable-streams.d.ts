// WebRTC insertable streams (MediaStreamTrackProcessor / MediaStreamTrackGenerator).
// Chromium only, hence not in lib.dom; declared as possibly undefined so callers feature-detect with typeof.

interface MediaStreamTrackProcessorInit {
    track: MediaStreamTrack;
    maxBufferSize?: number;
}

interface MediaStreamTrackProcessor {
    readonly readable: ReadableStream<VideoFrame>;
}

interface MediaStreamTrackGeneratorInit {
    kind: "audio" | "video";
}

/** The generator is itself the output track. */
interface MediaStreamTrackGenerator extends MediaStreamTrack {
    readonly writable: WritableStream<VideoFrame>;
}

declare const MediaStreamTrackProcessor:
    | { prototype: MediaStreamTrackProcessor; new (init: MediaStreamTrackProcessorInit): MediaStreamTrackProcessor }
    | undefined;

declare const MediaStreamTrackGenerator:
    | { prototype: MediaStreamTrackGenerator; new (init: MediaStreamTrackGeneratorInit): MediaStreamTrackGenerator }
    | undefined;
