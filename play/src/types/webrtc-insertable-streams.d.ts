// Type definitions for experimental WebRTC Insertable Streams API

interface MediaStreamTrackProcessor<VideoFrame> {
    readable: ReadableStream<VideoFrame>;
}

interface MediaStreamTrackProcessorConstructor {
    new (init: MediaStreamTrackProcessorInit): MediaStreamTrackProcessor<VideoFrame>;
}

interface MediaStreamTrackProcessorInit {
    track: MediaStreamVideoTrack;
}

interface MediaStreamTrackGenerator<VideoFrame> {
    writable: WritableStream<VideoFrame>;
    track: MediaStreamTrack;
}

interface MediaStreamTrackGeneratorConstructor {
    new (init: MediaStreamTrackGeneratorInit): MediaStreamTrackGenerator<VideoFrame>;
}

interface MediaStreamTrackGeneratorInit {
    kind: "audio" | "video";
}

// Extend the global Window interface
declare global {
    interface Window {
        MediaStreamTrackProcessor: MediaStreamTrackProcessorConstructor;
        MediaStreamTrackGenerator: MediaStreamTrackGeneratorConstructor;
        // MediaPipe types
        SelfieSegmentation?: unknown;
    }

    // Make them available globally
    const MediaStreamTrackProcessor: MediaStreamTrackProcessorConstructor;
    const MediaStreamTrackGenerator: MediaStreamTrackGeneratorConstructor;
}

// Additional type for MediaStreamVideoTrack
type MediaStreamVideoTrack = MediaStreamTrack & {
    kind: "video";
};

export {};
