import { createHmac } from "crypto";
import axios, { isAxiosError } from "axios";
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
    ANALYTICS_PSEUDONYMIZATION_SECRET,
    VIDEO_ANALYTICS_FLUSH_INTERVAL_MS,
    VIDEO_ANALYTICS_MAX_BATCH_SIZE,
    VIDEO_ANALYTICS_MAX_QUEUE_SIZE,
    VIDEO_ANALYTICS_TIMEOUT_MS,
} from "../enums/EnvironmentVariable";

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
const MAX_EVENT_PROPERTIES_BYTES = 8 * 1024;

/**
 * When a world opts out of `user_level_activity`, event `properties` are reduced
 * to a privacy-safe allowlist rather than filtered through a denylist (which
 * silently leaks any PII-bearing key we forget to enumerate — e.g. remoteUserUuid,
 * remoteSpaceUserId, spaceName, free-form names). Numeric/boolean values are never
 * PII and are always kept; among strings only these low-cardinality enums and
 * opaque grouping ids are preserved. Mirrors the admin-side
 * AnalyticsMetricsPolicyService allowlist so both anonymization gates agree.
 */
const ANONYMOUS_SAFE_PROPERTY_KEYS = new Set<string>([
    "areaId",
    "conversationId",
    "id",
    "conversationType",
    "meetingType",
    "meetingProvider",
    "mediaKind",
    "inviteType",
    "provider",
    "status",
    "triggerProperty",
    "fileExtension",
    // session lifecycle timestamps + reason (from AnalyticsPresenceTracker's
    // user.disconnected): non-PII behavioural data the admin turns into
    // connection_sessions rows. Must stay in sync with the admin allowlist —
    // stripping them here would silently drop every anonymized world's sessions.
    "connectedAt",
    "disconnectedAt",
    "disconnectReason",
    // Interval bounds + reason for every timed event (AnalyticsTimedEventTracker).
    // Pusher-generated ISO instants and an enum: non-PII by construction. Without
    // these, an anonymized world's conversations would arrive with a durationSeconds
    // (numbers always survive) but no interval to allocate it over — every query that
    // needs the start would silently read nothing.
    //
    // `endReason`, deliberately NOT `reason`: this allowlist is keyed on the property
    // key alone, not on (eventName, key), and `reason` is free text on the
    // experience-issue events (AnalyticsEventCatalog). Allow-listing `reason` to let
    // this one through would un-strip free-form text on those unrelated families.
    "startedAt",
    "endedAt",
    "endReason",
]);

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
    /** Must match the admin's. Absent ⇒ worlds that opted out report nothing. */
    pseudonymizationSecret?: string;
};

export type AnalyticsEventsQueueStats = {
    queueSize: number;
    droppedOnOverflow: number;
    droppedInvalid: number;
    droppedByWorldSettings: number;
    droppedAfterSendFailure: number;
    droppedMissingPseudonymizationSecret: number;
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
    private droppedMissingPseudonymizationSecret = 0;
    private warnedAboutMissingSecret = false;
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

        // Must stay after normalizeEvent, never before it: normalizeEvent enriches
        // the event from socketData, so anonymizing last is what guarantees the
        // allowlist sees the *final* properties. Anonymizing first would let
        // anything added during normalization through unfiltered.
        if (socketData.analyticsMetricsPolicy?.categories?.user_level_activity === false) {
            const secret = this.config.pseudonymizationSecret;
            // Fail closed. Without a secret we cannot produce a pseudonym the
            // world's administrator is unable to recompute from their own user
            // list, and this world asked precisely not to be tracked at user
            // level. Emitting anything here would hand over identifiers under a
            // label that promises they are anonymous.
            if (secret === undefined || secret === "") {
                this.droppedMissingPseudonymizationSecret += 1;
                this.warnOnceAboutMissingSecret();
                return;
            }
            normalizedEvent = anonymizeEvent(normalizedEvent, secret);
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
            droppedMissingPseudonymizationSecret: this.droppedMissingPseudonymizationSecret,
            batchesSent: this.batchesSent,
            eventsSent: this.eventsSent,
            flushErrors: this.flushErrors,
        };
    }

    /**
     * Once per process: a world opting out is a normal, per-event condition, so
     * warning each time would bury the operator in a log line per event while
     * telling them nothing new.
     */
    private warnOnceAboutMissingSecret(): void {
        if (this.warnedAboutMissingSecret) {
            return;
        }
        this.warnedAboutMissingSecret = true;
        console.warn(
            "Analytics events dropped: ANALYTICS_PSEUDONYMIZATION_SECRET is not set, so worlds that opted out of user-level activity cannot be pseudonymized. Set it (to the same value as the admin) to collect analytics for those worlds.",
        );
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
        try {
            // Byte length, not string length: `.length` counts UTF-16 code units, which
            // undercounts multi-byte characters and lets a CJK payload through at up to
            // ~3x the intended cap.
            const serializedPropertiesLength = Buffer.byteLength(JSON.stringify(event.properties ?? {}), "utf8");
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
        } catch (error) {
            console.warn("Analytics event dropped", {
                reason: "properties not serializable",
                eventName: event.eventName,
                eventId: event.eventId,
                error: error instanceof Error ? error.message : String(error),
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
        // client cannot spoof spaceName / remote-user attribution. This restores
        // the membership check the legacy VideoQualityAnalyticsQueue enforced.
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

function anonymizeEvent(event: AnalyticsEvent, secret: string): AnalyticsEvent {
    return {
        ...event,
        userUuid: anonymousIdentifier(event.world, event.userUuid, secret),
        userId: null,
        spaceUserId: anonymousIdentifier(event.world, event.spaceUserId, secret),
        clientIp: null,
        tabId: null,
        properties: anonymizeProperties(event.properties),
    };
}

function anonymizeProperties(properties: JsonObject): JsonObject {
    const safe: JsonObject = {};
    for (const [key, value] of Object.entries(properties)) {
        // Numbers and booleans carry counts/durations/flags, never PII.
        if (value === null || typeof value === "number" || typeof value === "boolean") {
            safe[key] = value;
            continue;
        }
        // Among strings, keep only the explicitly allow-listed non-PII keys.
        if (typeof value === "string" && ANONYMOUS_SAFE_PROPERTY_KEYS.has(key)) {
            safe[key] = value;
        }
        // Everything else (free-form strings, URLs, nested arrays/objects,
        // unknown keys) is intentionally dropped.
    }
    return safe;
}

/**
 * Pseudonymizes an identifier for a world that opted out of user-level activity.
 *
 * Keyed HMAC, not a salted hash. The previous version hashed with the legal
 * template version as its "salt" — a constant that lives in this repository and
 * is shipped to the pusher inside the policy itself. That protected nobody: the
 * party this anonymization exists to defend users *against* is the world's own
 * administrator, and they hold the list of user uuids. Hashing that list with a
 * public constant re-identifies every "anonymous" row. A secret the tenant does
 * not have makes the pseudonym actually opaque to them.
 *
 * The world is still part of the message so the same user is a different
 * pseudonym in each world, which stops cross-world correlation.
 */
function anonymousIdentifier(world: string, identifier: string, secret: string): string {
    return `anonymous:${createHmac("sha256", secret).update(`${world}|${identifier}`).digest("hex")}`;
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
        pseudonymizationSecret: ANALYTICS_PSEUDONYMIZATION_SECRET,
    };
}

export const analyticsEventsQueue = new AnalyticsEventsQueue(buildDefaultConfig());
