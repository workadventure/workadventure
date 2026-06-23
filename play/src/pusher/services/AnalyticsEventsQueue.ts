import axios, { isAxiosError } from "axios";
import { createHash } from "crypto";
import {
    VideoQualityRelayProtocol,
    VideoQualityStreamCategory,
    VideoQualityTransportType,
    type VideoQualityReportMessage,
    type VideoQualitySampleMessage,
} from "@workadventure/messages";
import type { AnalyticsMetricCategory, SocketData } from "../models/Websocket/SocketData";
import {
    ADMIN_API_TOKEN,
    ADMIN_API_URL,
    VIDEO_ANALYTICS_FLUSH_INTERVAL_MS,
    VIDEO_ANALYTICS_MAX_BATCH_SIZE,
    VIDEO_ANALYTICS_MAX_QUEUE_SIZE,
    VIDEO_ANALYTICS_TIMEOUT_MS,
} from "../enums/EnvironmentVariable";

const SCHEMA_VERSION = 1;
const RETRY_JITTER_MIN_MS = 50;
const RETRY_JITTER_MAX_MS = 250;

export type AnalyticsEventSource = "front" | "pusher" | "media";
type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

export type AnalyticsEventInput = {
    eventName: string;
    source: AnalyticsEventSource;
    clientEventTimeMs: number;
    eventId: string;
    properties: JsonObject;
};

export type AnalyticsEvent = {
    eventName: string;
    source: AnalyticsEventSource;
    clientEventTime: string;
    pusherReceivedAt: string;
    eventId: string;
    userUuid: string;
    userId: number | null;
    spaceUserId: string;
    clientIp: string | null;
    world: string;
    roomId: string;
    tabId: string | null;
    properties: JsonObject;
};

export type AnalyticsEventsBatch = {
    schemaVersion: typeof SCHEMA_VERSION;
    sentAt: string;
    pusherInstanceId: string;
    events: AnalyticsEvent[];
};

export type AnalyticsEventsQueueConfig = {
    adminApiUrl: string | undefined;
    adminApiToken: string | undefined;
    flushIntervalMs: number;
    timeoutMs: number;
    maxQueueSize: number;
    maxBatchSize: number;
    pusherInstanceId: string;
};

export type AnalyticsEventsQueueStats = {
    queueSize: number;
    droppedOnOverflow: number;
    droppedInvalid: number;
    droppedByWorldSettings: number;
    droppedAfterSendFailure: number;
    batchesSent: number;
    eventsSent: number;
    flushErrors: number;
};

type HttpPost = (
    url: string,
    payload: AnalyticsEventsBatch,
    options: { headers: Record<string, string>; timeout: number },
) => Promise<unknown>;

export class AnalyticsEventsQueue {
    private readonly queue: AnalyticsEvent[] = [];
    private readonly endpointUrl: string | undefined;
    private readonly timer: NodeJS.Timeout | undefined;
    private isFlushing = false;
    private enabled = false;
    private droppedOnOverflow = 0;
    private droppedInvalid = 0;
    private droppedByWorldSettings = 0;
    private droppedAfterSendFailure = 0;
    private batchesSent = 0;
    private eventsSent = 0;
    private flushErrors = 0;

    public constructor(
        private readonly config: AnalyticsEventsQueueConfig,
        private readonly post: HttpPost = (url, payload, options) => axios.post(url, payload, options),
        private readonly now: () => Date = () => new Date(),
        private readonly random: () => number = Math.random,
    ) {
        this.endpointUrl = config.adminApiUrl
            ? `${config.adminApiUrl.replace(/\/+$/, "")}/api/analytics/events-batch`
            : undefined;

        if (this.hasAdminApiConfig() && config.flushIntervalMs > 0) {
            this.timer = setInterval(() => {
                this.flush().catch((error) => {
                    this.logFlushError(error);
                });
            }, config.flushIntervalMs);
            this.timer.unref();
        }
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            this.queue.length = 0;
        }
    }

    public stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
        }
    }

    public enqueueEvent(event: AnalyticsEventInput, socketData: SocketData): void {
        if (!this.canSend()) {
            return;
        }

        if (socketData.analyticsEventsEnabled === false) {
            this.droppedByWorldSettings += 1;
            return;
        }

        const category = analyticsMetricCategoryForEvent(event.eventName);
        if (socketData.analyticsMetricsPolicy?.categories?.[category] === false) {
            this.droppedByWorldSettings += 1;
            return;
        }

        let normalizedEvent = this.normalizeEvent(event, socketData, this.now().toISOString());
        if (!normalizedEvent) {
            this.droppedInvalid += 1;
            return;
        }

        if (socketData.analyticsMetricsPolicy?.categories?.user_level_activity === false) {
            normalizedEvent = anonymizeEvent(normalizedEvent);
        }

        if (this.queue.length >= this.config.maxQueueSize) {
            this.queue.shift();
            this.droppedOnOverflow += 1;
        }

        this.queue.push(normalizedEvent);
    }

    public enqueueVideoQualityReport(report: VideoQualityReportMessage, socketData: SocketData): void {
        for (const sample of report.samples) {
            const event = this.videoQualitySampleToEvent(sample, socketData);
            if (!event) {
                this.droppedInvalid += 1;
                continue;
            }
            this.enqueueEvent(event, socketData);
        }
    }

    public async flush(): Promise<void> {
        if (!this.canSend() || this.queue.length === 0 || this.isFlushing) {
            return;
        }

        this.isFlushing = true;
        const batchEvents = this.queue.splice(0, this.config.maxBatchSize);
        const batch: AnalyticsEventsBatch = {
            schemaVersion: SCHEMA_VERSION,
            sentAt: this.now().toISOString(),
            pusherInstanceId: this.config.pusherInstanceId,
            events: batchEvents,
        };

        try {
            const sentEvents = await this.sendWithRetry(batch);
            this.batchesSent += 1;
            this.eventsSent += sentEvents;
        } catch (error) {
            this.flushErrors += 1;
            this.droppedAfterSendFailure += batchEvents.length;
            this.logFlushError(error);
        } finally {
            this.isFlushing = false;
        }
    }

    public getStats(): AnalyticsEventsQueueStats {
        return {
            queueSize: this.queue.length,
            droppedOnOverflow: this.droppedOnOverflow,
            droppedInvalid: this.droppedInvalid,
            droppedByWorldSettings: this.droppedByWorldSettings,
            droppedAfterSendFailure: this.droppedAfterSendFailure,
            batchesSent: this.batchesSent,
            eventsSent: this.eventsSent,
            flushErrors: this.flushErrors,
        };
    }

    private hasAdminApiConfig(): boolean {
        return this.endpointUrl !== undefined && this.config.adminApiToken !== undefined;
    }

    private canSend(): boolean {
        return this.enabled && this.hasAdminApiConfig() && this.config.maxQueueSize > 0 && this.config.maxBatchSize > 0;
    }

    private normalizeEvent(
        event: AnalyticsEventInput,
        socketData: SocketData,
        pusherReceivedAt: string,
    ): AnalyticsEvent | undefined {
        if (
            !isRequiredString(event.eventName) ||
            !isRequiredString(event.eventId) ||
            !isRequiredString(socketData.userUuid) ||
            !isRequiredString(socketData.spaceUserId) ||
            !isRequiredString(socketData.world) ||
            !isRequiredString(socketData.roomId)
        ) {
            console.warn("Analytics event dropped", {
                reason: "missing required event or socket context",
                eventName: event.eventName,
                eventId: event.eventId,
                reporterUserUuid: socketData.userUuid,
                roomId: socketData.roomId,
                world: socketData.world,
            });
            return undefined;
        }

        const clientEventDate = new Date(event.clientEventTimeMs);
        if (isNaN(clientEventDate.getTime())) {
            console.warn("Analytics event dropped", {
                reason: "invalid clientEventTimeMs",
                eventName: event.eventName,
                eventId: event.eventId,
                clientEventTimeMs: event.clientEventTimeMs,
            });
            return undefined;
        }

        return {
            eventName: event.eventName,
            source: event.source,
            clientEventTime: clientEventDate.toISOString(),
            pusherReceivedAt,
            eventId: event.eventId,
            userUuid: socketData.userUuid,
            userId: socketData.userId ?? null,
            spaceUserId: socketData.spaceUserId,
            clientIp: socketData.ipAddress || null,
            world: socketData.world,
            roomId: socketData.roomId,
            tabId: socketData.tabId ?? null,
            properties: event.properties,
        };
    }

    private videoQualitySampleToEvent(
        sample: VideoQualitySampleMessage,
        socketData: SocketData,
    ): AnalyticsEventInput | undefined {
        const clientEventDate = new Date(sample.clientEventTimeMs);
        if (isNaN(clientEventDate.getTime()) || !isRequiredString(sample.streamId)) {
            return undefined;
        }

        const streamCategory = toStreamCategory(sample.streamCategory);
        const transportType = toTransportType(sample.transportType);
        if (!streamCategory || !transportType || !isRequiredString(sample.spaceName)) {
            return undefined;
        }

        return {
            eventName: "media.video_quality.sample",
            source: "media",
            clientEventTimeMs: clientEventDate.getTime(),
            eventId: `${socketData.userUuid}:${sample.streamId}:${sample.sampleSeq ?? clientEventDate.getTime()}`,
            properties: {
                streamId: sample.streamId,
                connectionId: sample.connectionId ?? null,
                sessionId: sample.sessionId ?? null,
                remoteUserUuid: sample.remoteUserUuid ?? null,
                remoteSpaceUserId: sample.remoteSpaceUserId,
                spaceName: sample.spaceName,
                streamCategory,
                transportType,
                relay: sample.relay ?? null,
                relayProtocol: toRelayProtocol(sample.relayProtocol),
                livekitServerUrl: sample.livekitServerUrl ?? null,
                fps: sample.fps,
                fpsStdDev: Number.isFinite(sample.fpsStdDev) ? (sample.fpsStdDev ?? null) : null,
                jitter: sample.jitter,
                bandwidthBytesPerSecond: sample.bandwidthBytesPerSecond,
                frameWidth: Math.round(sample.frameWidth),
                frameHeight: Math.round(sample.frameHeight),
                mimeType: sample.mimeType ?? null,
                sampleSeq: sample.sampleSeq ?? null,
            },
        };
    }

    private async sendWithRetry(batch: AnalyticsEventsBatch): Promise<number> {
        if (!this.endpointUrl) {
            return 0;
        }

        try {
            await this.postBatch(batch);
            return batch.events.length;
        } catch (error) {
            if (this.shouldSplitInvalidBatch(error, batch)) {
                return await this.sendEventsIndividually(batch);
            }
            await sleep(this.retryDelayMs());
        }

        try {
            await this.postBatch(batch);
            return batch.events.length;
        } catch (error) {
            if (this.shouldSplitInvalidBatch(error, batch)) {
                return await this.sendEventsIndividually(batch);
            }
            throw error;
        }
    }

    private async postBatch(batch: AnalyticsEventsBatch): Promise<void> {
        if (!this.endpointUrl || this.config.adminApiToken === undefined) {
            return;
        }

        await this.post(this.endpointUrl, batch, {
            headers: {
                Authorization: `Bearer ${this.config.adminApiToken}`,
                "Content-Type": "application/json",
            },
            timeout: this.config.timeoutMs,
        });
    }

    private async sendEventsIndividually(batch: AnalyticsEventsBatch): Promise<number> {
        return batch.events.reduce<Promise<number>>(async (sentEventsPromise, event) => {
            const sentEvents = await sentEventsPromise;

            try {
                await this.postBatch({
                    ...batch,
                    events: [event],
                });
                return sentEvents + 1;
            } catch (error) {
                if (!this.isValidationError(error)) {
                    throw error;
                }

                this.droppedInvalid += 1;
                console.warn("Analytics event dropped after admin validation failed", {
                    eventName: event.eventName,
                    eventId: event.eventId,
                    response: isAxiosError(error) ? error.response?.data : undefined,
                });
                return sentEvents;
            }
        }, Promise.resolve(0));
    }

    private shouldSplitInvalidBatch(error: unknown, batch: AnalyticsEventsBatch): boolean {
        return batch.events.length > 1 && this.isValidationError(error);
    }

    private isValidationError(error: unknown): boolean {
        return isAxiosError(error) && error.response?.status === 422;
    }

    private retryDelayMs(): number {
        return RETRY_JITTER_MIN_MS + Math.floor(this.random() * (RETRY_JITTER_MAX_MS - RETRY_JITTER_MIN_MS + 1));
    }

    private logFlushError(error: unknown): void {
        if (isAxiosError(error)) {
            console.warn("Analytics events batch send failed", {
                message: error.message,
                status: error.response?.status,
                code: error.code,
                response: error.response?.data,
            });
            return;
        }

        console.warn("Analytics events batch send failed", error);
    }
}

function isRequiredString(value: string | undefined): value is string {
    return value !== undefined && value.length > 0;
}

function analyticsMetricCategoryForEvent(eventName: string): AnalyticsMetricCategory {
    if (eventName === "user.connected" || eventName === "user.disconnected" || eventName.startsWith("session.")) {
        return "presence_sessions";
    }

    if (
        eventName.startsWith("conversation.") ||
        eventName.startsWith("bubble.") ||
        eventName.startsWith("meeting.") ||
        eventName.startsWith("chat.") ||
        eventName.startsWith("megaphone.")
    ) {
        return "collaboration_activity";
    }

    if (
        eventName === "media.permission_denied" ||
        eventName === "media.device_error" ||
        eventName === "media.quality_issue" ||
        eventName.startsWith("media.") ||
        eventName.startsWith("map_loading.") ||
        eventName.startsWith("asset.") ||
        eventName.startsWith("websocket.") ||
        eventName.startsWith("front.") ||
        eventName.startsWith("performance.")
    ) {
        return "quality_diagnostics";
    }

    return "workspace_actions";
}

function anonymizeEvent(event: AnalyticsEvent): AnalyticsEvent {
    const properties = { ...event.properties };
    delete properties.connectionId;
    delete properties.sessionId;
    delete properties.tabId;

    return {
        ...event,
        userUuid: anonymousIdentifier(event.world, event.userUuid),
        userId: null,
        spaceUserId: anonymousIdentifier(event.world, event.spaceUserId),
        clientIp: null,
        tabId: null,
        properties,
    };
}

function anonymousIdentifier(world: string, identifier: string): string {
    return `anonymous:${createHash("sha256").update(`${world}|${identifier}|2026-06-23.v1`).digest("hex")}`;
}

function toStreamCategory(streamCategory: VideoQualityStreamCategory): "video" | "screenSharing" | undefined {
    if (streamCategory === VideoQualityStreamCategory.VIDEO_QUALITY_STREAM_CATEGORY_VIDEO) {
        return "video";
    }
    if (streamCategory === VideoQualityStreamCategory.VIDEO_QUALITY_STREAM_CATEGORY_SCREEN_SHARING) {
        return "screenSharing";
    }
    return undefined;
}

function toTransportType(transportType: VideoQualityTransportType): "P2P" | "Livekit" | undefined {
    if (transportType === VideoQualityTransportType.VIDEO_QUALITY_TRANSPORT_TYPE_P2P) {
        return "P2P";
    }
    if (transportType === VideoQualityTransportType.VIDEO_QUALITY_TRANSPORT_TYPE_LIVEKIT) {
        return "Livekit";
    }
    return undefined;
}

function toRelayProtocol(relayProtocol: VideoQualityRelayProtocol | undefined): "udp" | "tcp" | "tls" | null {
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

async function sleep(ms: number): Promise<void> {
    await new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function buildDefaultConfig(): AnalyticsEventsQueueConfig {
    return {
        adminApiUrl: ADMIN_API_URL,
        adminApiToken: ADMIN_API_TOKEN,
        flushIntervalMs: VIDEO_ANALYTICS_FLUSH_INTERVAL_MS,
        timeoutMs: VIDEO_ANALYTICS_TIMEOUT_MS,
        maxQueueSize: VIDEO_ANALYTICS_MAX_QUEUE_SIZE,
        maxBatchSize: VIDEO_ANALYTICS_MAX_BATCH_SIZE,
        pusherInstanceId: process.env.HOSTNAME || process.env.SERVER_NAME || "pusher",
    };
}

export const analyticsEventsQueue = new AnalyticsEventsQueue(buildDefaultConfig());
