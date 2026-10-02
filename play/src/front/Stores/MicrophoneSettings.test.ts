import { describe, expect, it } from "vitest";

import { buildMicrophoneAudioConstraints, getEffectiveNoiseSuppressionProvider } from "./MicrophoneSettings";

describe("getEffectiveNoiseSuppressionProvider", () => {
    it("keeps WorkAdventure as the default provider", () => {
        expect(
            getEffectiveNoiseSuppressionProvider({
                provider: "workadventure",
                voiceIsolationSupported: true,
            }),
        ).toBe("workadventure");
    });

    it("uses voice isolation only when verified from track settings", () => {
        expect(
            getEffectiveNoiseSuppressionProvider({
                provider: "voiceIsolation",
                voiceIsolationSupported: true,
            }),
        ).toBe("voiceIsolation");
        expect(
            getEffectiveNoiseSuppressionProvider({
                provider: "voiceIsolation",
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
        browserNoiseSuppressionEnabled: true,
        effectiveNoiseSuppressionProvider: "workadventure" as const,
        browserNoiseSuppressionSupported: true,
        workAdventureNoiseSuppressionFailed: false,
        customNoiseSuppressionActive: false,
        voiceIsolationAdvertised: true,
        deviceIdSupported: true,
        sampleRateSupported: true,
    };

    it("keeps browser microphone processing enabled by default when WorkAdventure noise suppression is off", () => {
        const constraints = buildMicrophoneAudioConstraints(defaultOptions);

        expect(constraints).toMatchObject({
            autoGainControl: true,
            echoCancellation: true,
            noiseSuppression: true,
            voiceIsolation: false,
        });
        expect(constraints).not.toHaveProperty("sampleRate");
    });

    it("does not request browser noise suppression when the browser switch is off", () => {
        expect(
            buildMicrophoneAudioConstraints({
                ...defaultOptions,
                browserNoiseSuppressionEnabled: false,
            }),
        ).toMatchObject({
            noiseSuppression: false,
            voiceIsolation: false,
        });
    });

    it("does not request browser noise suppression when the browser does not support it", () => {
        expect(
            buildMicrophoneAudioConstraints({
                ...defaultOptions,
                browserNoiseSuppressionSupported: false,
            }),
        ).toMatchObject({
            noiseSuppression: false,
            voiceIsolation: false,
        });
    });

    it("maps browser noise suppression to native constraints", () => {
        expect(
            buildMicrophoneAudioConstraints({
                ...defaultOptions,
                noiseSuppressionEnabled: true,
                browserNoiseSuppressionEnabled: true,
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
                browserNoiseSuppressionEnabled: true,
                workAdventureNoiseSuppressionFailed: true,
            }),
        ).toMatchObject({
            noiseSuppression: true,
            voiceIsolation: false,
        });
    });
});
