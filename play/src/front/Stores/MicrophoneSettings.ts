import type { NoiseSuppressionEngine, NoiseSuppressionProvider } from "../Connection/LocalUserStore";

export interface EffectiveNoiseSuppressionProviderOptions {
    provider: NoiseSuppressionProvider;
    voiceIsolationSupported: boolean;
}

export interface BuildMicrophoneAudioConstraintsOptions {
    microphoneDeviceId: string | undefined;
    autoGainControl: boolean;
    echoCancellation: boolean;
    noiseSuppressionEnabled: boolean;
    browserNoiseSuppressionEnabled: boolean;
    effectiveNoiseSuppressionProvider: NoiseSuppressionProvider;
    noiseSuppressionEngine: NoiseSuppressionEngine;
    browserNoiseSuppressionSupported: boolean;
    workAdventureNoiseSuppressionFailed: boolean;
    customNoiseSuppressionActive: boolean;
    voiceIsolationAdvertised: boolean;
    deviceIdSupported: boolean;
    sampleRateSupported: boolean;
}

/**
 * Chrome lists voiceIsolation in getSupportedConstraints() and reports it as false in getSettings() even where nothing
 * can apply it (desktop Chrome without its denoiser model), so only trust a track that has it on or can turn it on.
 */
export function isVoiceIsolationSupported(
    settings: MediaTrackSettings | undefined,
    capabilities: MediaTrackCapabilities | undefined,
): boolean {
    return settings?.voiceIsolation === true || capabilities?.voiceIsolation?.includes(true) === true;
}

export function getEffectiveNoiseSuppressionProvider({
    provider,
    voiceIsolationSupported,
}: EffectiveNoiseSuppressionProviderOptions): NoiseSuppressionProvider {
    if (provider === "voiceIsolation" && voiceIsolationSupported) {
        return "voiceIsolation";
    }
    return "workadventure";
}

export function buildMicrophoneAudioConstraints({
    microphoneDeviceId,
    autoGainControl,
    echoCancellation,
    noiseSuppressionEnabled,
    browserNoiseSuppressionEnabled,
    effectiveNoiseSuppressionProvider,
    noiseSuppressionEngine,
    browserNoiseSuppressionSupported,
    workAdventureNoiseSuppressionFailed,
    customNoiseSuppressionActive,
    voiceIsolationAdvertised,
    deviceIdSupported,
    sampleRateSupported,
}: BuildMicrophoneAudioConstraintsOptions): MediaTrackConstraints {
    const shouldUseBrowserNoiseSuppression =
        browserNoiseSuppressionEnabled &&
        browserNoiseSuppressionSupported &&
        (!customNoiseSuppressionActive || workAdventureNoiseSuppressionFailed);

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
    // DTLN runs at 16 kHz. DeepFilterNet3 needs the full band: its 48 kHz AudioContext resamples whatever the
    // microphone gives, so no constraint (and never an exact one, which would fail on 44.1 kHz devices).
    if (customNoiseSuppressionActive && noiseSuppressionEngine === "dtln" && sampleRateSupported) {
        constraints.sampleRate = { ideal: 16000 };
    }

    return constraints;
}
