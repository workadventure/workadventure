import { beforeEach, describe, expect, it } from "vitest";
import {
    getAudioContextDiagnostics,
    getAudioPlaybackDiagnostics,
    getInboundAudioRtpDiagnostics,
    registerAudioContextForDiagnostics,
    registerAudioPlaybackElement,
} from "./AudioDiagnostics";

describe("AudioDiagnostics", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });

    it("registers and unregisters AudioContext snapshots", () => {
        const context = {
            state: "running",
            sampleRate: 48_000,
            baseLatency: 0.01,
            outputLatency: 0.02,
            addEventListener: () => {},
            removeEventListener: () => {},
        } as unknown as AudioContext;

        const unregister = registerAudioContextForDiagnostics(context, "test-context");
        expect(getAudioContextDiagnostics()).toEqual([
            {
                label: "test-context",
                state: "running",
                sampleRate: 48_000,
                baseLatency: 0.01,
                outputLatency: 0.02,
            },
        ]);

        unregister();
        expect(getAudioContextDiagnostics()).toEqual([]);
    });

    it("associates playback element state with its MediaStream", () => {
        const stream = new MediaStream();
        const element = document.createElement("audio");
        element.autoplay = true;
        element.muted = true;
        element.volume = 0.5;

        const unregister = registerAudioPlaybackElement(stream, element);
        expect(getAudioPlaybackDiagnostics(stream)).toEqual([
            expect.objectContaining({
                autoplay: true,
                muted: true,
                paused: true,
                volume: 0.5,
            }),
        ]);

        unregister();
        expect(getAudioPlaybackDiagnostics(stream)).toEqual([]);
    });

    it("extracts only inbound audio RTP evidence", () => {
        const values = [
            {
                id: "audio",
                type: "inbound-rtp",
                kind: "audio",
                bytesReceived: 1234,
                packetsReceived: 12,
                packetsLost: 1,
                totalAudioEnergy: 4.2,
            },
            { id: "video", type: "inbound-rtp", kind: "video", bytesReceived: 9999 },
        ];
        const report = {
            forEach: (callback: (value: unknown) => void) => values.forEach(callback),
        } as unknown as RTCStatsReport;

        expect(getInboundAudioRtpDiagnostics(report)).toEqual([
            expect.objectContaining({
                bytesReceived: 1234,
                packetsReceived: 12,
                packetsLost: 1,
                totalAudioEnergy: 4.2,
            }),
        ]);
    });
});
