import * as Sentry from "@sentry/svelte";

export interface AudioTrackDiagnostic {
    id: string;
    enabled: boolean;
    muted: boolean;
    readyState: MediaStreamTrackState;
    label: string;
    settings: MediaTrackSettings;
}

export interface AudioContextDiagnostic {
    label: string;
    state: AudioContextState;
    sampleRate: number;
    baseLatency: number | undefined;
    outputLatency: number | undefined;
    details?: Record<string, unknown>;
}

export interface AudioPlaybackDiagnostic {
    autoplay: boolean;
    currentTime: number;
    errorCode: number | undefined;
    muted: boolean;
    networkState: number;
    paused: boolean;
    readyState: number;
    sinkId: string | undefined;
    volume: number;
}

export interface AudioRtpDiagnostic {
    bytesReceived: number | undefined;
    codecId: string | undefined;
    concealedSamples: number | undefined;
    jitter: number | undefined;
    kind: string | undefined;
    packetsLost: number | undefined;
    packetsReceived: number | undefined;
    silentConcealedSamples: number | undefined;
    totalAudioEnergy: number | undefined;
    totalSamplesDuration: number | undefined;
    trackIdentifier: string | undefined;
}

interface RegisteredAudioContext {
    context: AudioContext;
    label: string;
    getDetails?: () => Record<string, unknown>;
    lastState: AudioContextState;
    handleStateChange: () => void;
}

const registeredAudioContexts = new Map<AudioContext, RegisteredAudioContext>();
const playbackElementsByStream = new Map<MediaStream, Set<HTMLAudioElement>>();

export function describeAudioTrack(track: MediaStreamTrack): AudioTrackDiagnostic {
    return {
        id: track.id,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        label: track.label,
        settings: track.getSettings(),
    };
}

export function registerAudioContextForDiagnostics(
    context: AudioContext,
    label: string,
    getDetails?: () => Record<string, unknown>,
): () => void {
    const previousRegistration = registeredAudioContexts.get(context);
    if (previousRegistration && typeof context.removeEventListener === "function") {
        context.removeEventListener("statechange", previousRegistration.handleStateChange);
    }

    const registration: RegisteredAudioContext = {
        context,
        label,
        getDetails,
        lastState: context.state,
        handleStateChange: () => {
            const previousState = registration.lastState;
            registration.lastState = context.state;
            const details = {
                ...describeAudioContext(registration),
                previousState,
                visibilityState: document.visibilityState,
                documentHasFocus: document.hasFocus(),
                userActivation: navigator.userActivation
                    ? {
                          hasBeenActive: navigator.userActivation.hasBeenActive,
                          isActive: navigator.userActivation.isActive,
                      }
                    : undefined,
                ...registration.getDetails?.(),
            };

            console.info("[AudioContextDiagnostics] AudioContext state changed", details);
            if (context.state === "interrupted") {
                Sentry.captureMessage("AudioContext entered interrupted state", {
                    level: "warning",
                    tags: {
                        component: "AudioContextDiagnostics",
                        audioContext: label,
                    },
                    extra: details,
                });
            }
        },
    };

    registeredAudioContexts.set(context, registration);
    if (typeof context.addEventListener === "function") {
        context.addEventListener("statechange", registration.handleStateChange);
    }

    return () => {
        const currentRegistration = registeredAudioContexts.get(context);
        if (currentRegistration !== registration) return;
        if (typeof context.removeEventListener === "function") {
            context.removeEventListener("statechange", registration.handleStateChange);
        }
        registeredAudioContexts.delete(context);
    };
}

export function getAudioContextDiagnostics(): AudioContextDiagnostic[] {
    return Array.from(registeredAudioContexts.values(), describeAudioContext);
}

export function registerAudioPlaybackElement(stream: MediaStream, element: HTMLAudioElement): () => void {
    let elements = playbackElementsByStream.get(stream);
    if (!elements) {
        elements = new Set();
        playbackElementsByStream.set(stream, elements);
    }
    elements.add(element);

    return () => {
        elements?.delete(element);
        if (elements?.size === 0) {
            playbackElementsByStream.delete(stream);
        }
    };
}

export function getAudioPlaybackDiagnostics(stream: MediaStream | undefined): AudioPlaybackDiagnostic[] {
    if (!stream) return [];
    return Array.from(playbackElementsByStream.get(stream) ?? [], (element) => ({
        autoplay: element.autoplay,
        currentTime: element.currentTime,
        errorCode: element.error?.code,
        muted: element.muted,
        networkState: element.networkState,
        paused: element.paused,
        readyState: element.readyState,
        sinkId: "sinkId" in element ? element.sinkId : undefined,
        volume: element.volume,
    }));
}

export function getInboundAudioRtpDiagnostics(report: RTCStatsReport): AudioRtpDiagnostic[] {
    const diagnostics: AudioRtpDiagnostic[] = [];
    report.forEach((stat) => {
        const value = stat as RTCInboundRtpStreamStats & {
            kind?: string;
            mediaType?: string;
            silentConcealedSamples?: number;
        };
        if (value.type !== "inbound-rtp" || (value.kind !== "audio" && value.mediaType !== "audio")) return;
        diagnostics.push({
            bytesReceived: value.bytesReceived,
            codecId: value.codecId,
            concealedSamples: value.concealedSamples,
            jitter: value.jitter,
            kind: value.kind ?? value.mediaType,
            packetsLost: value.packetsLost,
            packetsReceived: value.packetsReceived,
            silentConcealedSamples: value.silentConcealedSamples,
            totalAudioEnergy: value.totalAudioEnergy,
            totalSamplesDuration: value.totalSamplesDuration,
            trackIdentifier: value.trackIdentifier,
        });
    });
    return diagnostics;
}

function describeAudioContext(registration: RegisteredAudioContext): AudioContextDiagnostic {
    const { context, label } = registration;
    const details = registration.getDetails?.();
    return {
        label,
        state: context.state,
        sampleRate: context.sampleRate,
        baseLatency: "baseLatency" in context ? context.baseLatency : undefined,
        outputLatency: "outputLatency" in context ? context.outputLatency : undefined,
        ...(details ? { details } : {}),
    };
}
