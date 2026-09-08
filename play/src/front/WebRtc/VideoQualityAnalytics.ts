import type { Readable, Unsubscriber } from "svelte/store";
import type { VideoQualityReportMessage, VideoQualitySampleMessage } from "@workadventure/messages";
import {
    VideoQualityLimitationReason,
    VideoQualityRelayProtocol,
    VideoQualityStreamCategory,
    VideoQualityStreamDirection,
    VideoQualityTransportType,
} from "@workadventure/messages";
import type { WebRtcSenderStats, WebRtcStats } from "../Components/Video/WebRtcStats";
import { hasCapability } from "../Connection/Capabilities";

const VIDEO_ANALYTICS_SEND_INTERVAL_MS = 5_000;
const VIDEO_QUALITY_ANALYTICS_CAPABILITY = "api/analytics/video-quality-batch";

export type VideoQualityAnalyticsContext = {
    streamId: string;
    streamCategory: "video" | "screenSharing";
    transportType: "P2P" | "Livekit";
    // Empty for streams sent to a LiveKit server (no single remote user)
    remoteSpaceUserId: string;
    remoteUserUuid?: string;
    spaceName: string;
    connectionId?: string;
    livekitServerUrl?: string;
};

const sessionId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Reports the quality of a video stream we receive.
 */
export function subscribeToVideoQualityAnalytics(
    statsStore: Readable<WebRtcStats | undefined>,
    context: VideoQualityAnalyticsContext,
    sendReport: (message: VideoQualityReportMessage) => void,
): Unsubscriber {
    return subscribeToSamples(statsStore, context, sendReport, (stats, base) => {
        // A stream the sender paused on purpose (we do not display it) says nothing about the connection
        if (stats.paused || !isValidStats(stats)) {
            return undefined;
        }
        return {
            ...base,
            direction: VideoQualityStreamDirection.VIDEO_QUALITY_STREAM_DIRECTION_INBOUND,
            relay: stats.relay,
            relayProtocol: toRelayProtocol(stats.relayProtocol),
            fps: stats.fps,
            fpsStdDev: stats.fpsStdDev,
            jitter: stats.jitter,
            bandwidthBytesPerSecond: stats.bandwidth,
            frameWidth: toUInt32(stats.frameWidth),
            frameHeight: toUInt32(stats.frameHeight),
            mimeType: stats.mimeType,
        };
    });
}

/**
 * Reports the health of the encoder of a video stream we send (camera or screen share): whether the browser is
 * CPU or bandwidth limited, and which encoder it uses.
 */
export function subscribeToOutboundVideoQualityAnalytics(
    statsStore: Readable<WebRtcSenderStats | undefined>,
    context: VideoQualityAnalyticsContext,
    sendReport: (message: VideoQualityReportMessage) => void,
): Unsubscriber {
    return subscribeToSamples(statsStore, context, sendReport, (stats, base) => {
        if (!isValidSenderStats(stats)) {
            return undefined;
        }
        return {
            ...base,
            direction: VideoQualityStreamDirection.VIDEO_QUALITY_STREAM_DIRECTION_OUTBOUND,
            fps: stats.fps,
            // The sender has no receive jitter
            jitter: 0,
            bandwidthBytesPerSecond: stats.bandwidth,
            frameWidth: toUInt32(stats.frameWidth),
            frameHeight: toUInt32(stats.frameHeight),
            mimeType: stats.mimeType,
            qualityLimitationReason: toLimitationReason(stats.qualityLimitationReason),
            encoderImplementation: stats.encoderImplementation,
        };
    });
}

type BaseSample = Pick<
    VideoQualitySampleMessage,
    | "clientEventTimeMs"
    | "sampleSeq"
    | "streamId"
    | "connectionId"
    | "sessionId"
    | "remoteUserUuid"
    | "remoteSpaceUserId"
    | "spaceName"
    | "streamCategory"
    | "transportType"
    | "livekitServerUrl"
>;

function subscribeToSamples<T>(
    statsStore: Readable<T | undefined>,
    context: VideoQualityAnalyticsContext,
    sendReport: (message: VideoQualityReportMessage) => void,
    buildSample: (stats: T, base: BaseSample) => VideoQualitySampleMessage | undefined,
): Unsubscriber {
    if (hasCapability(VIDEO_QUALITY_ANALYTICS_CAPABILITY) !== "v1") {
        return () => {};
    }

    let sampleSeq = 0;
    let lastSentAt = 0;

    return statsStore.subscribe((stats) => {
        if (!stats) {
            return;
        }

        const now = Date.now();
        if (now - lastSentAt < VIDEO_ANALYTICS_SEND_INTERVAL_MS) {
            return;
        }

        const sample = buildSample(stats, {
            clientEventTimeMs: now,
            sampleSeq,
            streamId: context.streamId,
            connectionId: context.connectionId,
            sessionId,
            remoteUserUuid: context.remoteUserUuid,
            remoteSpaceUserId: context.remoteSpaceUserId,
            spaceName: context.spaceName,
            streamCategory: toStreamCategory(context.streamCategory),
            transportType: toTransportType(context.transportType),
            livekitServerUrl: context.livekitServerUrl,
        });
        if (!sample) {
            return;
        }

        lastSentAt = now;
        sampleSeq += 1;

        try {
            sendReport({ samples: [sample] });
        } catch (e) {
            console.error("Error while sending video quality analytics report", e);
        }
    });
}

function isValidStats(stats: WebRtcStats): boolean {
    return (
        Number.isFinite(stats.fps) &&
        Number.isFinite(stats.jitter) &&
        Number.isFinite(stats.bandwidth) &&
        Number.isFinite(stats.frameWidth) &&
        Number.isFinite(stats.frameHeight) &&
        (stats.fpsStdDev === undefined || Number.isFinite(stats.fpsStdDev))
    );
}

function isValidSenderStats(stats: WebRtcSenderStats): boolean {
    return (
        Number.isFinite(stats.fps) &&
        Number.isFinite(stats.bandwidth) &&
        Number.isFinite(stats.frameWidth) &&
        Number.isFinite(stats.frameHeight) &&
        // A paused track encodes nothing: not worth a sample, unless the encoder is stalled by a limitation
        (stats.fps > 0 || stats.qualityLimitationReason !== "none")
    );
}

function toStreamCategory(category: VideoQualityAnalyticsContext["streamCategory"]): VideoQualityStreamCategory {
    return category === "screenSharing"
        ? VideoQualityStreamCategory.VIDEO_QUALITY_STREAM_CATEGORY_SCREEN_SHARING
        : VideoQualityStreamCategory.VIDEO_QUALITY_STREAM_CATEGORY_VIDEO;
}

function toTransportType(transportType: VideoQualityAnalyticsContext["transportType"]): VideoQualityTransportType {
    return transportType === "Livekit"
        ? VideoQualityTransportType.VIDEO_QUALITY_TRANSPORT_TYPE_LIVEKIT
        : VideoQualityTransportType.VIDEO_QUALITY_TRANSPORT_TYPE_P2P;
}

function toRelayProtocol(relayProtocol: WebRtcStats["relayProtocol"]): VideoQualityRelayProtocol | undefined {
    if (relayProtocol === "udp") {
        return VideoQualityRelayProtocol.VIDEO_QUALITY_RELAY_PROTOCOL_UDP;
    }
    if (relayProtocol === "tcp") {
        return VideoQualityRelayProtocol.VIDEO_QUALITY_RELAY_PROTOCOL_TCP;
    }
    if (relayProtocol === "tls") {
        return VideoQualityRelayProtocol.VIDEO_QUALITY_RELAY_PROTOCOL_TLS;
    }
    return undefined;
}

function toLimitationReason(reason: WebRtcSenderStats["qualityLimitationReason"]): VideoQualityLimitationReason {
    switch (reason) {
        case "cpu":
            return VideoQualityLimitationReason.VIDEO_QUALITY_LIMITATION_REASON_CPU;
        case "bandwidth":
            return VideoQualityLimitationReason.VIDEO_QUALITY_LIMITATION_REASON_BANDWIDTH;
        case "other":
            return VideoQualityLimitationReason.VIDEO_QUALITY_LIMITATION_REASON_OTHER;
        default:
            return VideoQualityLimitationReason.VIDEO_QUALITY_LIMITATION_REASON_NONE;
    }
}

function toUInt32(value: number): number {
    return Math.max(0, Math.round(value));
}
