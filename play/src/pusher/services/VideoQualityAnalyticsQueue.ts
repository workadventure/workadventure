import axios, { isAxiosError } from "axios";
import {
    VideoQualityRelayProtocol,
    VideoQualityStreamCategory,
    VideoQualityTransportType,
    type VideoQualityReportMessage,
    type VideoQualitySampleMessage,
} from "@workadventure/messages";
import type { SocketData } from "../models/Websocket/SocketData";
import {
    VIDEO_ANALYTICS_ADMIN_URL,
    VIDEO_ANALYTICS_API_KEY,
    VIDEO_ANALYTICS_ENABLED,
    VIDEO_ANALYTICS_FLUSH_INTERVAL_MS,
    VIDEO_ANALYTICS_MAX_BATCH_SIZE,
    VIDEO_ANALYTICS_MAX_QUEUE_SIZE,
    VIDEO_ANALYTICS_TIMEOUT_MS,
} from "../enums/EnvironmentVariable";

const SCHEMA_VERSION = 1;
const RETRY_JITTER_MIN_MS = 50;
const RETRY_JITTER_MAX_MS = 250;

export type VideoQualityAnalyticsStreamCategory = "video" | "screenSharing";
export type VideoQualityAnalyticsTransportType = "P2P" | "Livekit";
export type VideoQualityAnalyticsRelayProtocol = "udp" | "tcp" | "tls";

export type VideoQualityAnalyticsSample = {
    clientEventTime: string;
    pusherReceivedAt: string;
    reporterUserUuid: string;
    remoteUserUuid: string | null;
    reporterUserId: number | null;
    reporterSpaceUserId: string;
    remoteSpaceUserId: string;
    spaceName: string;
    world: string;
    roomId: string;
    tabId: string | null;
    reporterClientIp: string | null;
    streamId: string;
    streamCategory: VideoQualityAnalyticsStreamCategory;
    transportType: VideoQualityAnalyticsTransportType;
    relay: boolean | null;
    relayProtocol: VideoQualityAnalyticsRelayProtocol | null;
    livekitServerUrl: string | null;
    fps: number;
    fpsStdDev: number | null;
    jitter: number;
    bandwidthBytesPerSecond: number;
    frameWidth: number;
    frameHeight: number;
    mimeType: string | null;
    sampleSeq: number | null;
    connectionId: string | null;
    sessionId: string | null;
};

export type VideoQualityAnalyticsBatch = {
    schemaVersion: typeof SCHEMA_VERSION;
    sentAt: string;
    pusherInstanceId: string;
    samples: VideoQualityAnalyticsSample[];
};

export type VideoQualityAnalyticsQueueConfig = {
    enabled: boolean;
    adminUrl: string | undefined;
    apiKey: string | undefined;
    flushIntervalMs: number;
    timeoutMs: number;
    maxQueueSize: number;
    maxBatchSize: number;
    pusherInstanceId: string;
};

export type VideoQualityAnalyticsQueueStats = {
    queueSize: number;
    droppedOnOverflow: number;
    droppedInvalid: number;
    droppedAfterSendFailure: number;
    batchesSent: number;
    samplesSent: number;
    flushErrors: number;
};

type HttpPost = (
    url: string,
    payload: VideoQualityAnalyticsBatch,
    options: { headers: Record<string, string>; timeout: number }
) => Promise<unknown>;

export class VideoQualityAnalyticsQueue {
    private readonly queue: VideoQualityAnalyticsSample[] = [];
    private readonly endpointUrl: string | undefined;
    private readonly timer: NodeJS.Timeout | undefined;
    private isFlushing = false;
    private droppedOnOverflow = 0;
    private droppedInvalid = 0;
    private droppedAfterSendFailure = 0;
    private batchesSent = 0;
    private samplesSent = 0;
    private flushErrors = 0;

    public constructor(
        private readonly config: VideoQualityAnalyticsQueueConfig,
        private readonly post: HttpPost = (url, payload, options) => axios.post(url, payload, options),
        private readonly now: () => Date = () => new Date(),
        private readonly random: () => number = Math.random
    ) {
        this.endpointUrl = config.adminUrl
            ? `${config.adminUrl.replace(/\/+$/, "")}/api/analytics/video-quality-batch`
            : undefined;

        if (this.canSend() && config.flushIntervalMs > 0) {
            this.timer = setInterval(() => {
                this.flush().catch((error) => {
                    this.logFlushError(error);
                });
            }, config.flushIntervalMs);
            // Analytics flushing must not keep the Node.js process alive during shutdown or tests.
            this.timer.unref();
        }
    }

    public stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
        }
    }

    public enqueueReport(report: VideoQualityReportMessage, socketData: SocketData): void {
        if (!this.canSend()) {
            return;
        }

        const pusherReceivedAt = this.now().toISOString();
        const reporterClientIp = socketData.ipAddress || null;

        for (const sample of report.samples) {
            const normalizedSample = this.normalizeSample(sample, socketData, pusherReceivedAt, reporterClientIp);
            if (!normalizedSample) {
                this.droppedInvalid += 1;
                continue;
            }

            if (this.queue.length >= this.config.maxQueueSize) {
                this.queue.shift();
                this.droppedOnOverflow += 1;
            }

            this.queue.push(normalizedSample);
        }
    }

    public async flush(): Promise<void> {
        if (!this.canSend() || this.queue.length === 0 || this.isFlushing) {
            return;
        }

        this.isFlushing = true;
        const batchSamples = this.queue.splice(0, this.config.maxBatchSize);
        const batch: VideoQualityAnalyticsBatch = {
            schemaVersion: SCHEMA_VERSION,
            sentAt: this.now().toISOString(),
            pusherInstanceId: this.config.pusherInstanceId,
            samples: batchSamples,
        };

        try {
            await this.sendWithRetry(batch);
            this.batchesSent += 1;
            this.samplesSent += batchSamples.length;
        } catch (error) {
            this.flushErrors += 1;
            this.droppedAfterSendFailure += batchSamples.length;
            this.logFlushError(error);
        } finally {
            this.isFlushing = false;
        }
    }

    public getStats(): VideoQualityAnalyticsQueueStats {
        return {
            queueSize: this.queue.length,
            droppedOnOverflow: this.droppedOnOverflow,
            droppedInvalid: this.droppedInvalid,
            droppedAfterSendFailure: this.droppedAfterSendFailure,
            batchesSent: this.batchesSent,
            samplesSent: this.samplesSent,
            flushErrors: this.flushErrors,
        };
    }

    private canSend(): boolean {
        return (
            this.config.enabled &&
            this.config.adminUrl !== undefined &&
            this.config.apiKey !== undefined &&
            this.config.maxQueueSize > 0 &&
            this.config.maxBatchSize > 0
        );
    }

    private normalizeSample(
        sample: VideoQualitySampleMessage,
        socketData: SocketData,
        pusherReceivedAt: string,
        reporterClientIp: string | null
    ): VideoQualityAnalyticsSample | undefined {
        const streamCategory = toStreamCategory(sample.streamCategory);
        const transportType = toTransportType(sample.transportType);
        const relayProtocol = toRelayProtocol(sample.relayProtocol);

        if (streamCategory === undefined) {
            console.warn("Video quality analytics sample dropped", {
                reason: "unsupported stream category",
                streamId: sample.streamId,
                spaceName: sample.spaceName,
                reporterUserUuid: socketData.userUuid,
                streamCategory: sample.streamCategory,
            });
            return undefined;
        }

        if (transportType === undefined) {
            console.warn("Video quality analytics sample dropped", {
                reason: "unsupported transport type",
                streamId: sample.streamId,
                spaceName: sample.spaceName,
                reporterUserUuid: socketData.userUuid,
                transportType: sample.transportType,
            });
            return undefined;
        }

        if (
            !isRequiredString(sample.streamId) ||
            !isRequiredString(sample.remoteSpaceUserId) ||
            !isRequiredString(sample.spaceName)
        ) {
            console.warn("Video quality analytics sample dropped", {
                reason: "missing required sample context",
                streamId: sample.streamId,
                spaceName: sample.spaceName,
                reporterUserUuid: socketData.userUuid,
            });
            return undefined;
        }

        if (
            !isRequiredString(socketData.userUuid) ||
            !isRequiredString(socketData.spaceUserId) ||
            !isRequiredString(socketData.world) ||
            !isRequiredString(socketData.roomId)
        ) {
            console.warn("Video quality analytics sample dropped", {
                reason: "missing required socket context",
                streamId: sample.streamId,
                spaceName: sample.spaceName,
                reporterUserUuid: socketData.userUuid,
                reporterSpaceUserId: socketData.spaceUserId,
                roomId: socketData.roomId,
                world: socketData.world,
            });
            return undefined;
        }

        if (socketData.spaces.size > 0 && !socketData.spaces.has(sample.spaceName)) {
            console.warn("Video quality analytics sample dropped", {
                reason: "socket is not joined to reported space",
                streamId: sample.streamId,
                spaceName: sample.spaceName,
                reporterUserUuid: socketData.userUuid,
                reporterSpaceUserId: socketData.spaceUserId,
                joinedSpaces: Array.from(socketData.spaces),
            });
            return undefined;
        }

        return {
            clientEventTime: new Date(sample.clientEventTimeMs).toISOString(),
            pusherReceivedAt,
            reporterUserUuid: socketData.userUuid,
            remoteUserUuid: sample.remoteUserUuid ?? null,
            reporterUserId: socketData.userId ?? null,
            reporterSpaceUserId: socketData.spaceUserId,
            remoteSpaceUserId: sample.remoteSpaceUserId,
            spaceName: sample.spaceName,
            world: socketData.world,
            roomId: socketData.roomId,
            tabId: socketData.tabId ?? null,
            reporterClientIp,
            streamId: sample.streamId,
            streamCategory,
            transportType,
            relay: sample.relay ?? null,
            relayProtocol,
            livekitServerUrl: sample.livekitServerUrl ?? null,
            fps: sample.fps,
            fpsStdDev: sample.fpsStdDev ?? null,
            jitter: sample.jitter,
            bandwidthBytesPerSecond: sample.bandwidthBytesPerSecond,
            frameWidth: Math.round(sample.frameWidth),
            frameHeight: Math.round(sample.frameHeight),
            mimeType: sample.mimeType ?? null,
            sampleSeq: sample.sampleSeq ?? null,
            connectionId: sample.connectionId ?? null,
            sessionId: sample.sessionId ?? null,
        };
    }

    private async sendWithRetry(batch: VideoQualityAnalyticsBatch): Promise<void> {
        if (!this.endpointUrl) {
            return;
        }

        try {
            await this.postBatch(batch);
            return;
        } catch {
            await sleep(this.retryDelayMs());
        }

        await this.postBatch(batch);
    }

    private async postBatch(batch: VideoQualityAnalyticsBatch): Promise<void> {
        if (!this.endpointUrl) {
            return;
        }

        await this.post(this.endpointUrl, batch, {
            headers: {
                Authorization: `Bearer ${this.config.apiKey}`,
                "Content-Type": "application/json",
            },
            timeout: this.config.timeoutMs,
        });
    }

    private retryDelayMs(): number {
        return RETRY_JITTER_MIN_MS + Math.floor(this.random() * (RETRY_JITTER_MAX_MS - RETRY_JITTER_MIN_MS + 1));
    }

    private logFlushError(error: unknown): void {
        if (isAxiosError(error)) {
            console.warn("Video quality analytics batch send failed", {
                message: error.message,
                status: error.response?.status,
                code: error.code,
            });
            return;
        }

        console.warn("Video quality analytics batch send failed", error);
    }
}

function toStreamCategory(streamCategory: VideoQualityStreamCategory): VideoQualityAnalyticsStreamCategory | undefined {
    if (streamCategory === VideoQualityStreamCategory.VIDEO_QUALITY_STREAM_CATEGORY_VIDEO) {
        return "video";
    }
    if (streamCategory === VideoQualityStreamCategory.VIDEO_QUALITY_STREAM_CATEGORY_SCREEN_SHARING) {
        return "screenSharing";
    }
    return undefined;
}

function toTransportType(transportType: VideoQualityTransportType): VideoQualityAnalyticsTransportType | undefined {
    if (transportType === VideoQualityTransportType.VIDEO_QUALITY_TRANSPORT_TYPE_P2P) {
        return "P2P";
    }
    if (transportType === VideoQualityTransportType.VIDEO_QUALITY_TRANSPORT_TYPE_LIVEKIT) {
        return "Livekit";
    }
    return undefined;
}

function toRelayProtocol(
    relayProtocol: VideoQualityRelayProtocol | undefined
): VideoQualityAnalyticsRelayProtocol | null {
    if (relayProtocol === VideoQualityRelayProtocol.VIDEO_QUALITY_RELAY_PROTOCOL_UDP) {
        return "udp";
    }
    if (relayProtocol === VideoQualityRelayProtocol.VIDEO_QUALITY_RELAY_PROTOCOL_TCP) {
        return "tcp";
    }
    if (relayProtocol === VideoQualityRelayProtocol.VIDEO_QUALITY_RELAY_PROTOCOL_TLS) {
        return "tls";
    }
    return null;
}

function isRequiredString(value: string | undefined): value is string {
    return value !== undefined && value.length > 0;
}

async function sleep(ms: number): Promise<void> {
    await new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function buildDefaultConfig(): VideoQualityAnalyticsQueueConfig {
    return {
        enabled: VIDEO_ANALYTICS_ENABLED,
        adminUrl: VIDEO_ANALYTICS_ADMIN_URL,
        apiKey: VIDEO_ANALYTICS_API_KEY,
        flushIntervalMs: VIDEO_ANALYTICS_FLUSH_INTERVAL_MS,
        timeoutMs: VIDEO_ANALYTICS_TIMEOUT_MS,
        maxQueueSize: VIDEO_ANALYTICS_MAX_QUEUE_SIZE,
        maxBatchSize: VIDEO_ANALYTICS_MAX_BATCH_SIZE,
        pusherInstanceId: process.env.HOSTNAME || process.env.SERVER_NAME || "pusher",
    };
}

export const videoQualityAnalyticsQueue = new VideoQualityAnalyticsQueue(buildDefaultConfig());
