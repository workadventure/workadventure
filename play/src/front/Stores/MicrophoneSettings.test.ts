import { describe, expect, it } from "vitest";

import { buildMicrophoneAudioConstraints, getEffectiveNoiseSuppressionProvider } from "./MicrophoneSettings";

describe("getEffectiveNoiseSuppressionProvider", () => {
    it("keeps WorkAdventure as the default provider", () => {
        expect(
            getEffectiveNoiseSuppressionProvider({
                provider: "workadventure",
                browserNoiseSuppressionSupported: true,
                voiceIsolationSupported: true,
            }),
        ).toBe("workadventure");
    });

    it("uses browser noise suppression only when supported", () => {
        expect(
            getEffectiveNoiseSuppressionProvider({
                provider: "browser",
                browserNoiseSuppressionSupported: true,
                voiceIsolationSupported: false,
            }),
        ).toBe("browser");
        expect(
            getEffectiveNoiseSuppressionProvider({
                provider: "browser",
                browserNoiseSuppressionSupported: false,
                voiceIsolationSupported: false,
            }),
        ).toBe("workadventure");
    });

    it("uses voice isolation only when verified from track settings", () => {
        expect(
            getEffectiveNoiseSuppressionProvider({
                provider: "voiceIsolation",
                browserNoiseSuppressionSupported: true,
                voiceIsolationSupported: true,
            }),
        ).toBe("voiceIsolation");
        expect(
            getEffectiveNoiseSuppressionProvider({
                provider: "voiceIsolation",
                browserNoiseSuppressionSupported: true,
                voiceIsolationSupported: false,
            }),
        ).toBe("workadventure");
    });
});

describe("buildMicrophoneAudioConstraints", () => {
    const defaultOptions = {
        microphoneDeviceId: undefined,
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppressionEnabled: false,
        effectiveNoiseSuppressionProvider: "workadventure" as const,
        browserNoiseSuppressionSupported: true,
        workAdventureNoiseSuppressionFailed: false,
        customNoiseSuppressionActive: false,
        voiceIsolationAdvertised: true,
        deviceIdSupported: true,
        sampleRateSupported: true,
    };

    it("keeps automatic gain control and echo cancellation enabled by default", () => {
        expect(buildMicrophoneAudioConstraints(defaultOptions)).toMatchObject({
            autoGainControl: true,
            echoCancellation: true,
            noiseSuppression: false,
            voiceIsolation: false,
        });
    });

    it("maps browser noise suppression to native constraints", () => {
        expect(
            buildMicrophoneAudioConstraints({
                ...defaultOptions,
                noiseSuppressionEnabled: true,
                effectiveNoiseSuppressionProvider: "browser",
            }),
        ).toMatchObject({
            noiseSuppression: true,
            voiceIsolation: false,
        });
    });

    it("maps voice isolation to the voiceIsolation constraint", () => {
        expect(
            buildMicrophoneAudioConstraints({
                ...defaultOptions,
                noiseSuppressionEnabled: true,
                effectiveNoiseSuppressionProvider: "voiceIsolation",
            }),
        ).toMatchObject({
            noiseSuppression: true,
            voiceIsolation: true,
        });
    });

    it("disables native processing and requests 16 kHz for active WorkAdventure noise suppression", () => {
        expect(
            buildMicrophoneAudioConstraints({
                ...defaultOptions,
                microphoneDeviceId: "mic-1",
                noiseSuppressionEnabled: true,
                customNoiseSuppressionActive: true,
            }),
        ).toMatchObject({
            deviceId: { exact: "mic-1" },
            noiseSuppression: false,
            sampleRate: { ideal: 16000 },
            voiceIsolation: false,
        });
    });

    it("falls back to browser noise suppression when WorkAdventure noise suppression failed", () => {
        expect(
            buildMicrophoneAudioConstraints({
                ...defaultOptions,
                noiseSuppressionEnabled: true,
                workAdventureNoiseSuppressionFailed: true,
            }),
        ).toMatchObject({
            noiseSuppression: true,
            voiceIsolation: false,
        });
    });
});
