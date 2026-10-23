import { describe, expect, it, vi } from "vitest";
import type { Writable } from "svelte/store";
import { writable } from "svelte/store";
import type { SpaceInterface } from "../../Space/SpaceInterface";
import type { Streamable } from "../../Space/Streamable";
import type { VideoBox } from "../../Space/VideoBox";
import { ScriptingInputAudioStreamManager } from "./ScriptingInputAudioStreamManager";

const listenedStreams = new Set<MediaStream>();

vi.mock("./InputPCMStreamer", () => ({
    InputPCMStreamer: class {
        pcmDataStream = { subscribe: () => ({ unsubscribe: () => {} }) };
        initWorklet = () => Promise.resolve();
        addMediaStream = (stream: MediaStream) => listenedStreams.add(stream);
        removeMediaStream = (stream: MediaStream) => listenedStreams.delete(stream);
        close = () => listenedStreams.clear();
    },
}));
vi.mock("../../Api/IframeListener", () => ({ iframeListener: { postMessage: vi.fn() } }));

function streamable(type: "webrtc" | "livekit", streamStore: Writable<MediaStream | undefined>): Streamable {
    return { media: { type, streamStore } } as unknown as Streamable;
}

describe("ScriptingInputAudioStreamManager", () => {
    it("follows a video box that switches from P2P to LiveKit after the listening started", async () => {
        const p2pStream = { id: "p2p" } as MediaStream;
        const oldLivekitStream = { id: "livekit-old" } as MediaStream;
        const newLivekitStream = { id: "livekit-new" } as MediaStream;
        const livekitStreamStore = writable<MediaStream | undefined>(oldLivekitStream);
        const boxStreamable = writable<Streamable | undefined>(streamable("webrtc", writable(p2pStream)));
        const videoBox = { streamable: boxStreamable } as unknown as VideoBox;
        const space = { videoStreamStore: writable(new Map([["bob", videoBox]])) } as unknown as SpaceInterface;

        const manager = new ScriptingInputAudioStreamManager(space);
        await manager.startListeningToAudioStream(24000);
        expect([...listenedStreams]).toEqual([p2pStream]);

        // The P2P connection closes: the box promotes the LiveKit streamable it was holding as pending
        boxStreamable.set(streamable("livekit", livekitStreamStore));
        expect([...listenedStreams]).toEqual([oldLivekitStream]);

        // The remote user restarts its scripting audio stream: LiveKit publishes a new track
        livekitStreamStore.set(newLivekitStream);
        expect([...listenedStreams]).toEqual([newLivekitStream]);

        manager.stopListeningToAudioStream();
        livekitStreamStore.set(oldLivekitStream);
        expect(listenedStreams.size).toBe(0);
    });
});
