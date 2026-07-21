import { defaultFrontConfiguration } from "./defaultEnv";

// Vitest setup: provide a minimal MediaStream polyfill for Node test environment

class MediaStreamPolyfill {
    private tracks: unknown[];

    constructor(tracks: unknown[] = []) {
        this.tracks = tracks;
    }

    getTracks(): unknown[] {
        return this.tracks;
    }
    getAudioTracks(): unknown[] {
        return this.tracks.filter((track) => (track as MediaStreamTrack).kind === "audio");
    }
    getVideoTracks(): unknown[] {
        return this.tracks.filter((track) => (track as MediaStreamTrack).kind === "video");
    }
    addTrack(track: unknown): void {
        this.tracks.push(track);
    }
    removeTrack(track: unknown): void {
        this.tracks = this.tracks.filter((currentTrack) => currentTrack !== track);
    }
}

if (typeof globalThis.MediaStream === "undefined") {
    globalThis.MediaStream = MediaStreamPolyfill as unknown as typeof MediaStream;
}

if (typeof window !== "undefined" && window.env === undefined) {
    window.env = defaultFrontConfiguration;
}

if (typeof window !== "undefined" && typeof window.matchMedia === "undefined") {
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => undefined,
            removeListener: () => undefined,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            dispatchEvent: () => false,
        }),
    });
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

const PhaserModule = await import("phaser");
globalThis.Phaser = PhaserModule.default ?? PhaserModule;
