import type { NoiseSuppressionProvider } from "../Connection/LocalUserStore";

export interface EffectiveNoiseSuppressionProviderOptions {
    provider: NoiseSuppressionProvider;
    browserNoiseSuppressionSupported: boolean;
    voiceIsolationSupported: boolean;
}

export interface BuildMicrophoneAudioConstraintsOptions {
    microphoneDeviceId: string | undefined;
    autoGainControl: boolean;
    echoCancellation: boolean;
    noiseSuppressionEnabled: boolean;
    effectiveNoiseSuppressionProvider: NoiseSuppressionProvider;
    browserNoiseSuppressionSupported: boolean;
    workAdventureNoiseSuppressionFailed: boolean;
    customNoiseSuppressionActive: boolean;
    voiceIsolationAdvertised: boolean;
    deviceIdSupported: boolean;
    sampleRateSupported: boolean;
}

export function getEffectiveNoiseSuppressionProvider({
    provider,
    browserNoiseSuppressionSupported,
    voiceIsolationSupported,
}: EffectiveNoiseSuppressionProviderOptions): NoiseSuppressionProvider {
    if (provider === "voiceIsolation" && voiceIsolationSupported) {
        return "voiceIsolation";
    }
    if (provider === "browser" && browserNoiseSuppressionSupported) {
        return "browser";
    }
    return "workadventure";
}

export function buildMicrophoneAudioConstraints({
    microphoneDeviceId,
    autoGainControl,
    echoCancellation,
    noiseSuppressionEnabled,
    effectiveNoiseSuppressionProvider,
    browserNoiseSuppressionSupported,
    workAdventureNoiseSuppressionFailed,
    customNoiseSuppressionActive,
    voiceIsolationAdvertised,
    deviceIdSupported,
    sampleRateSupported,
}: BuildMicrophoneAudioConstraintsOptions): MediaTrackConstraints {
    const shouldUseBrowserNoiseSuppression =
        noiseSuppressionEnabled &&
        browserNoiseSuppressionSupported &&
        (effectiveNoiseSuppressionProvider === "browser" ||
            effectiveNoiseSuppressionProvider === "voiceIsolation" ||
            (effectiveNoiseSuppressionProvider === "workadventure" && workAdventureNoiseSuppressionFailed));

    const constraints: MediaTrackConstraints = {
        autoGainControl,
        echoCancellation,
        noiseSuppression: shouldUseBrowserNoiseSuppression,
    };

    if (voiceIsolationAdvertised) {
        constraints.voiceIsolation = noiseSuppressionEnabled && effectiveNoiseSuppressionProvider === "voiceIsolation";
    }
    if (microphoneDeviceId !== undefined && deviceIdSupported) {
        constraints.deviceId = { exact: microphoneDeviceId };
    }
    if (customNoiseSuppressionActive && sampleRateSupported) {
        constraints.sampleRate = { ideal: 16000 };
    }

    return constraints;
}
