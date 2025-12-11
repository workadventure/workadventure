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

// jsdom does not implement CanvasRenderingContext2D; Phaser expects it during import.
// Provide a minimal stub so canvas feature detection does not crash in tests.
const createStubContext = () => {
    const data = new Uint8ClampedArray([0, 0, 0, 255]);
    return {
        fillStyle: "",
        globalCompositeOperation: "source-over",
        drawImage: () => undefined,
        fillRect: () => undefined,
        getImageData: () => ({ data }),
        putImageData: () => undefined,
    } as unknown as CanvasRenderingContext2D;
};

// @ts-ignore Override getContext to return our stub instead of throwing "not implemented".
HTMLCanvasElement.prototype.getContext = function getContext() {
    return createStubContext();
};
