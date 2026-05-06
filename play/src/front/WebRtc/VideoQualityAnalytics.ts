import type { Readable, Unsubscriber } from "svelte/store";
import type { VideoQualityReportMessage, VideoQualitySampleMessage } from "@workadventure/messages";
import {
    VideoQualityRelayProtocol,
    VideoQualityStreamCategory,
    VideoQualityTransportType,
} from "@workadventure/messages";
import type { WebRtcStats } from "../Components/Video/WebRtcStats";
import { hasCapability } from "../Connection/Capabilities";

const VIDEO_ANALYTICS_SEND_INTERVAL_MS = 5_000;
const VIDEO_QUALITY_ANALYTICS_CAPABILITY = "api/analytics/video-quality-batch";

export type VideoQualityAnalyticsContext = {
    streamId: string;
    streamCategory: "video" | "screenSharing";
    transportType: "P2P" | "Livekit";
    remoteSpaceUserId: string;
    remoteUserUuid?: string;
    spaceName: string;
    connectionId?: string;
    livekitServerUrl?: string;
};

const sessionId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function subscribeToVideoQualityAnalytics(
    statsStore: Readable<WebRtcStats | undefined>,
    context: VideoQualityAnalyticsContext,
    sendReport: (message: VideoQualityReportMessage) => void
): Unsubscriber {
    if (hasCapability(VIDEO_QUALITY_ANALYTICS_CAPABILITY) !== "v1") {
        return () => {};
    }

    let sampleSeq = 0;
    let lastSentAt = 0;

    return statsStore.subscribe((stats) => {
        if (!stats || !isValidStats(stats)) {
            return;
        }

        const now = Date.now();
        if (now - lastSentAt < VIDEO_ANALYTICS_SEND_INTERVAL_MS) {
            return;
        }
        lastSentAt = now;

        const sample: VideoQualitySampleMessage = {
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
            relay: stats.relay,
            relayProtocol: toRelayProtocol(stats.relayProtocol),
            livekitServerUrl: context.livekitServerUrl,
            fps: stats.fps,
            fpsStdDev: stats.fpsStdDev,
            jitter: stats.jitter,
            bandwidthBytesPerSecond: stats.bandwidth,
            frameWidth: toUInt32(stats.frameWidth),
            frameHeight: toUInt32(stats.frameHeight),
            mimeType: stats.mimeType,
        };

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

function toUInt32(value: number): number {
    return Math.max(0, Math.round(value));
}
