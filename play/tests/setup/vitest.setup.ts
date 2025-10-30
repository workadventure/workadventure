// Vitest setup: provide a minimal MediaStream polyfill for Node test environment

class MediaStreamPolyfill {
    constructor(_tracks?: unknown[]) {}
    getTracks(): unknown[] {
        return [];
    }
    getAudioTracks(): unknown[] {
        return [];
    }
    getVideoTracks(): unknown[] {
        return [];
    }
    addTrack(_track: unknown): void {}
    removeTrack(_track: unknown): void {}
}

if (typeof globalThis.MediaStream === "undefined") {
    globalThis.MediaStream = MediaStreamPolyfill as unknown as typeof MediaStream;
}
