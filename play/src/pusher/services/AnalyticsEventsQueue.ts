import axios, { isAxiosError } from "axios";
import {
    VideoQualityRelayProtocol,
    VideoQualityStreamCategory,
    VideoQualityTransportType,
    type AnalyticsEventsBatchPayload,
    type VideoQualityReportMessage,
    type VideoQualitySampleMessage,
} from "@workadventure/messages";
import type { SocketData } from "../models/Websocket/SocketData";
import {
    ADMIN_API_TOKEN,
    ADMIN_API_URL,
    ANALYTICS_FLUSH_INTERVAL_MS,
    ANALYTICS_MAX_BATCH_SIZE,
    ANALYTICS_MAX_QUEUE_SIZE,
    ANALYTICS_TIMEOUT_MS,
} from "../enums/EnvironmentVariable";
import { registerDrainableService } from "./ShutdownDrains";

const SCHEMA_VERSION = 1;
const RETRY_JITTER_MIN_MS = 50;
const RETRY_JITTER_MAX_MS = 250;
const MAX_FLUSH_ATTEMPTS = 4;
const RETRY_BASE_DELAY_MS = 250;
const RETRY_MAX_DELAY_MS = 5_000;
/**
 * Hard cap on a single event's serialized properties size. The admin API will
 * reject events whose properties exceed its own bound; capping client-side
 * avoids round-tripping multi-MB junk through the queue.
 */
export const MAX_EVENT_PROPERTIES_BYTES = 8 * 1024;

/**
 * Serialized size of a properties bag, or undefined when it cannot be serialized.
 *
 * Byte length, not string length: `.length` counts UTF-16 code units, which
 * undercounts multi-byte characters and lets a CJK payload through at up to ~3x
 * the intended cap.
 *
 * Exported because the cap has to be applied at every point that *retains* a
 * client-supplied payload, not only at the one that queues it — see
 * AnalyticsReportMessageHandler, where an open control frame is held in memory
 * until its interval closes.
 */
export function serializedPropertiesBytes(properties: unknown): number | undefined {
    try {
        return Buffer.byteLength(JSON.stringify(properties ?? {}), "utf8");
    } catch {
        return undefined;
    }
}

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

/**
 * Derived from the schema Swagger publishes, rather than written out again here:
 * the two used to be separate declarations that could disagree without anything
 * noticing. `events` is narrowed back to the pusher's own AnalyticsEvent, whose
 * `properties` is a JsonObject rather than the contract's looser record.
 */
export type AnalyticsEventsBatch = Omit<AnalyticsEventsBatchPayload, "events"> & {
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

    /**
     * Drains the queue by flushing batches sequentially until it is empty or the deadline elapses.
     * Used by the graceful-shutdown hook so events queued at SIGTERM time still reach the admin.
     * Sequential awaits are intentional: flush() must complete before the next batch is sent.
     */
    public async drain(timeoutMs = 10_000): Promise<void> {
        if (!this.canSend()) {
            return;
        }

        const deadline = Date.now() + timeoutMs;
        while (this.queue.length > 0 && Date.now() < deadline) {
            const lengthBefore = this.queue.length;
            // eslint-disable-next-line no-await-in-loop
            await this.flush(deadline);
            // flush() splices maxBatchSize events; loop again until queue is empty.
            // If nothing was sent (e.g. another flush is in flight), wait briefly and retry.
            if (this.queue.length === lengthBefore) {
                // eslint-disable-next-line no-await-in-loop
                await new Promise<void>((resolve) => {
                    setTimeout(resolve, 50);
                });
            }
        }
    }

    public enqueueEvent(event: AnalyticsEventInput, socketData: SocketData): void {
        if (!this.canSend()) {
            return;
        }

        // The only privacy gate left on this side, and it is a bandwidth
        // optimisation rather than a guarantee: a world that turned analytics off
        // has nothing worth shipping. Category filtering and anonymization belong
        // to the admin, which owns the policy and applies it at ingestion
        // (AnalyticsEventsService::filterEvents). Duplicating them here bought
        // nothing and could only drift.
        if (socketData.analyticsEventsEnabled === false) {
            this.droppedByWorldSettings += 1;
            return;
        }

        const normalizedEvent = this.normalizeEvent(event, socketData, this.now().toISOString());
        if (!normalizedEvent) {
            this.droppedInvalid += 1;
            return;
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

    public async flush(deadline?: number): Promise<void> {
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
            const sentEvents = await this.sendWithRetry(batch, deadline);
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

        // Defense-in-depth: front-side controllers are expected to enforce the
        // source whitelist, but reject anything else here so a misbehaving
        // client cannot impersonate a backend source by editing its payload.
        if (event.source !== "front" && event.source !== "pusher" && event.source !== "media") {
            console.warn("Analytics event dropped", {
                reason: "invalid source",
                eventName: event.eventName,
                eventId: event.eventId,
                source: event.source,
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

        // Bound the per-event properties payload. The admin API will reject
        // oversized events with 422; capping here keeps the in-memory queue
        // from being filled with multi-MB junk.
        const serializedPropertiesLength = serializedPropertiesBytes(event.properties);
        if (serializedPropertiesLength === undefined) {
            console.warn("Analytics event dropped", {
                reason: "properties not serializable",
                eventName: event.eventName,
                eventId: event.eventId,
            });
            return undefined;
        }
        if (serializedPropertiesLength > MAX_EVENT_PROPERTIES_BYTES) {
            console.warn("Analytics event dropped", {
                reason: "properties exceed max bytes",
                eventName: event.eventName,
                eventId: event.eventId,
                bytes: serializedPropertiesLength,
                maxBytes: MAX_EVENT_PROPERTIES_BYTES,
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

        // Reject samples attributed to a space the socket has not joined, so a
        // client cannot spoof spaceName / remote-user attribution.
        //
        // No "only check when the socket has joined something" escape hatch: that
        // made the guard opt-out by simply never joining a space, and a socket with
        // no space membership was free to pick spaceName, remoteUserUuid and
        // remoteSpaceUserId. It also protected nothing real — a quality sample
        // measures a stream, a stream lives in a space, so a socket in no space has
        // nothing legitimate to report.
        const fullSpaceName = `${socketData.world}.${sample.spaceName}`;
        if (!socketData.spaces.has(fullSpaceName)) {
            console.warn("Analytics video-quality sample dropped: socket not joined to reported space", {
                streamId: sample.streamId,
                spaceName: sample.spaceName,
                reporterUserUuid: socketData.userUuid,
            });
            return undefined;
        }

        return {
            eventName: "media.video_quality.sample",
            // "pusher", not "media": this event is synthesized here from a
            // videoQualityReportMessage, never reported directly by a socket. The
            // admin lists it in PUSHER_ONLY_EVENT_NAMES and drops it unless the
            // source says pusher, so "media" meant every sample was discarded on
            // arrival.
            source: "pusher",
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

    private async sendWithRetry(batch: AnalyticsEventsBatch, deadline?: number): Promise<number> {
        if (!this.endpointUrl) {
            return 0;
        }

        let lastError: unknown;
        for (let attempt = 0; attempt < MAX_FLUSH_ATTEMPTS; attempt++) {
            // During a bounded drain (SIGTERM), stop before starting an attempt we
            // have no time budget left for, so the drain never overshoots its deadline.
            if (deadline !== undefined && Date.now() >= deadline) {
                break;
            }
            try {
                // eslint-disable-next-line no-await-in-loop
                await this.postBatch(batch, deadline);
                return batch.events.length;
            } catch (error) {
                lastError = error;
                if (this.shouldSplitInvalidBatch(error, batch)) {
                    // eslint-disable-next-line no-await-in-loop
                    return await this.sendEventsIndividually(batch, deadline);
                }
                // Don't retry on non-transient errors (4xx that isn't 422 already handled above).
                if (this.isNonRetryableError(error)) {
                    throw error;
                }
                if (attempt < MAX_FLUSH_ATTEMPTS - 1) {
                    const delay = this.retryDelayMs(attempt);
                    // Don't sleep past the drain deadline — that's exactly the overshoot
                    // (SIGKILL mid-flush) this bound exists to prevent.
                    if (deadline !== undefined && Date.now() + delay >= deadline) {
                        break;
                    }
                    // eslint-disable-next-line no-await-in-loop
                    await sleep(delay);
                }
            }
        }

        if (lastError instanceof Error) {
            throw lastError;
        }
        throw new Error("Analytics drain deadline reached before the batch could be sent");
    }

    private isNonRetryableError(error: unknown): boolean {
        if (!isAxiosError(error)) {
            return false;
        }
        const status = error.response?.status;
        // Retry 5xx + network failures. Treat 408/429 as retryable too.
        // 422 is handled via shouldSplitInvalidBatch above.
        if (status === undefined) {
            return false;
        }
        if (status === 408 || status === 429) {
            return false;
        }
        return status >= 400 && status < 500;
    }

    /**
     * @openapi
     * /api/analytics/events-batch:
     *   post:
     *     tags: ["AdminAPI"]
     *     description: >
     *       Accepts a batch of analytics events collected by one pusher instance.
     *       Every event conforms to the shared catalog (AnalyticsEvent): `eventName`
     *       is a closed set the pusher validates against before sending, and `source`
     *       is pinned per event — `pusher` marks events the pusher synthesized itself,
     *       which a socket may never claim and which the admin projects into
     *       connection sessions. `properties` is passthrough, so a newer front may add
     *       fields to a known event without a lockstep deploy.
     *       Best-effort: the pusher retries transient failures and splits a rejected
     *       batch to isolate the offending events, so ingestion should be idempotent
     *       on `eventId`.
     *     security:
     *      - Bearer: []
     *     consumes:
     *      - "application/json"
     *     produces:
     *      - "application/json"
     *     parameters:
     *      - name: "payload"
     *        in: "body"
     *        required: true
     *        schema:
     *          $ref: '#/definitions/AnalyticsEventsBatch'
     *     responses:
     *       202:
     *         description: Batch accepted
     *       401:
     *         description: Unauthorized
     *       413:
     *         description: Batch too large
     *       422:
     *         description: >
     *           Invalid payload. The pusher responds by re-sending the batch one event
     *           at a time to isolate the offending events — see sendEventsIndividually.
     */
    private async postBatch(batch: AnalyticsEventsBatch, deadline?: number): Promise<void> {
        if (!this.endpointUrl || this.config.adminApiToken === undefined) {
            return;
        }

        // Under a bounded drain, cap the HTTP timeout to the time left so a single
        // slow request cannot run past the drain deadline.
        const timeout =
            deadline !== undefined
                ? Math.max(1, Math.min(this.config.timeoutMs, deadline - Date.now()))
                : this.config.timeoutMs;

        await this.post(this.endpointUrl, batch, {
            headers: {
                Authorization: `Bearer ${this.config.adminApiToken}`,
                "Content-Type": "application/json",
            },
            timeout,
        });
    }

    /**
     * Per-event retry path after a 422 split. Never throws: partial success and
     * per-event failure are accounted to the per-class counters so the caller
     * cannot double-count `droppedAfterSendFailure` for events that already
     * succeeded individually. A non-validation error aborts the loop and the
     * remaining unsent events are recorded against `droppedAfterSendFailure`.
     */
    private async sendEventsIndividually(batch: AnalyticsEventsBatch, deadline?: number): Promise<number> {
        let sentEvents = 0;
        for (let i = 0; i < batch.events.length; i++) {
            const event = batch.events[i];

            // postBatch caps each request's timeout by the remaining budget, but the
            // loop itself must stop too: past the deadline this would still fire one
            // request per event (up to maxBatchSize, i.e. 1000 by default) with a 1ms
            // timeout each, pushing the shutdown well past its grace period.
            if (deadline !== undefined && Date.now() >= deadline) {
                const remaining = batch.events.length - i;
                this.droppedAfterSendFailure += remaining;
                console.warn("Analytics events dropped: drain deadline reached during the per-event retry", {
                    dropped: remaining,
                    sent: sentEvents,
                });
                return sentEvents;
            }

            try {
                // eslint-disable-next-line no-await-in-loop
                await this.postBatch(
                    {
                        ...batch,
                        events: [event],
                    },
                    deadline,
                );
                sentEvents += 1;
            } catch (error) {
                if (this.isValidationError(error)) {
                    this.droppedInvalid += 1;
                    console.warn("Analytics event dropped after admin validation failed", {
                        eventName: event.eventName,
                        eventId: event.eventId,
                        response: isAxiosError(error) ? error.response?.data : undefined,
                    });
                    continue;
                }

                // Non-validation error mid-loop: stop and count only the events we did
                // not send (current one + everything after) as send-failure drops.
                const remaining = batch.events.length - i;
                this.droppedAfterSendFailure += remaining;
                this.flushErrors += 1;
                this.logFlushError(error);
                return sentEvents;
            }
        }
        return sentEvents;
    }

    private shouldSplitInvalidBatch(error: unknown, batch: AnalyticsEventsBatch): boolean {
        return batch.events.length > 1 && this.isValidationError(error);
    }

    private isValidationError(error: unknown): boolean {
        return isAxiosError(error) && error.response?.status === 422;
    }

    private retryDelayMs(attempt = 0): number {
        // Exponential backoff with full-jitter, capped at RETRY_MAX_DELAY_MS.
        // attempt is 0-based. attempt=0 ⇒ ~RETRY_BASE_DELAY_MS,
        // attempt=1 ⇒ up to 2x, attempt=2 ⇒ up to 4x, …
        const exponential = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
        const jitter =
            RETRY_JITTER_MIN_MS + Math.floor(this.random() * (RETRY_JITTER_MAX_MS - RETRY_JITTER_MIN_MS + 1));
        return exponential + jitter;
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
        flushIntervalMs: ANALYTICS_FLUSH_INTERVAL_MS,
        timeoutMs: ANALYTICS_TIMEOUT_MS,
        maxQueueSize: ANALYTICS_MAX_QUEUE_SIZE,
        maxBatchSize: ANALYTICS_MAX_BATCH_SIZE,
        pusherInstanceId: process.env.HOSTNAME || process.env.SERVER_NAME || "pusher",
    };
}

export const analyticsEventsQueue = new AnalyticsEventsQueue(buildDefaultConfig());

// Declared here rather than listed in server.ts: what this queue holds and how it
// lets go of it is this file's business, and a service that forgets to say so
// loses its buffer on every deploy without anything failing.
registerDrainableService({
    name: "the generic analytics queue",
    drain: (timeoutMs) => analyticsEventsQueue.drain(timeoutMs),
    stop: () => analyticsEventsQueue.stop(),
});
