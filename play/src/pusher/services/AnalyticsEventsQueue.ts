import {
    VideoQualityLimitationReason,
    VideoQualityRelayProtocol,
    VideoQualityStreamCategory,
    VideoQualityStreamDirection,
    VideoQualityTransportType,
    type AnalyticsEventEnvelope,
    type AnalyticsEventName,
    type AnalyticsStoredEvent,
    type VideoQualityReportMessage,
    type VideoQualitySampleMessage,
} from "@workadventure/messages";
import {
    AnalyticsEventsQueue as SharedAnalyticsEventsQueue,
    registerDrainableService,
    type AnalyticsEventsBatch,
    type AnalyticsEventsQueueConfig,
    type AnalyticsEventsQueueStats as SharedAnalyticsEventsQueueStats,
} from "@workadventure/shared-utils";
import type { SocketData } from "../models/Websocket/SocketData";
import {
    ADMIN_API_TOKEN,
    ADMIN_API_URL,
    ANALYTICS_FLUSH_INTERVAL_MS,
    ANALYTICS_MAX_BATCH_SIZE,
    ANALYTICS_MAX_QUEUE_SIZE,
    ANALYTICS_TIMEOUT_MS,
} from "../enums/EnvironmentVariable";

export type { AnalyticsEventsBatch, AnalyticsEventsQueueConfig };

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

/**
 * What enters the queue: one catalog envelope, so an event the pusher synthesizes
 * itself (a video quality sample, an interval) is checked against its catalog
 * entry by the compiler. A hand-written `{ [key]: JsonValue }` used to sit here,
 * and it let `transportType: "Livekit"` through for an enum that only knows
 * `"SFU"`.
 */
export type AnalyticsEventInput = AnalyticsEventEnvelope;

/**
 * What leaves the queue: the stored-event contract, with `eventName` narrowed
 * from the contract's string to the catalog's. `properties` stays the contract's
 * record — past this point it is a payload on its way out, not something to
 * reason about per event.
 */
export type AnalyticsEvent = Omit<AnalyticsStoredEvent, "eventName"> & { eventName: AnalyticsEventName };

export type AnalyticsEventsQueueStats = SharedAnalyticsEventsQueueStats & {
    droppedByWorldSettings: number;
};

/**
 * What the pusher adds to the shared transport: the row is built from a socket's
 * context and checked before it is queued. The transport itself — batching,
 * retries, the bounded drain — is `@workadventure/shared-utils`, and the back
 * uses the same one.
 */
export class AnalyticsEventsQueue extends SharedAnalyticsEventsQueue {
    private droppedByWorldSettings = 0;

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

        this.enqueue(normalizedEvent);
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

    public override getStats(): AnalyticsEventsQueueStats {
        return { ...super.getStats(), droppedByWorldSettings: this.droppedByWorldSettings };
    }

    private normalizeEvent(
        event: AnalyticsEventInput,
        socketData: SocketData,
        pusherReceivedAt: string,
    ): AnalyticsEvent | undefined {
        // The event itself is already validated: everything a socket reports is
        // parsed against its catalog schema in processAnalyticsReportMessage, which
        // pins the name, the source, the event id and the timestamp far more tightly
        // than a hand-rolled check could — and the two callers that skip the handler
        // (AnalyticsTimedEventTracker and the video-quality conversion below) build
        // their events here, in typed code. What is checked below is what the catalog
        // does *not* see: the socket context, which never travels in the message, and
        // the size of `properties`, which every catalog schema lets through under
        // `.passthrough()`.
        if (
            !isRequiredString(socketData.userUuid) ||
            !isRequiredString(socketData.spaceUserId) ||
            !isRequiredString(socketData.world) ||
            !isRequiredString(socketData.roomId)
        ) {
            console.warn("Analytics event dropped", {
                reason: "missing required socket context",
                eventName: event.eventName,
                eventId: event.eventId,
                reporterUserUuid: socketData.userUuid,
                roomId: socketData.roomId,
                world: socketData.world,
            });
            return undefined;
        }

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
            clientEventTime: new Date(event.clientEventTimeMs).toISOString(),
            pusherReceivedAt,
            eventId: event.eventId,
            userUuid: socketData.userUuid,
            userId: socketData.userId ?? null,
            spaceUserId: socketData.spaceUserId,
            clientIp: socketData.ipAddress || null,
            world: socketData.world,
            roomId: socketData.roomId,
            tabId: socketData.tabId,
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
        const direction = toDirection(sample.direction);
        if (!streamCategory || !transportType || !isRequiredString(sample.spaceName)) {
            return undefined;
        }

        // NaN and Infinity are valid protobuf doubles but serialize to null, which
        // the admin rejects — and a rejection costs a whole 422 split.
        if (
            !Number.isFinite(sample.fps) ||
            !Number.isFinite(sample.jitter) ||
            !Number.isFinite(sample.bandwidthBytesPerSecond) ||
            !Number.isFinite(sample.frameWidth) ||
            !Number.isFinite(sample.frameHeight)
        ) {
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
                // A stream published to a LiveKit server is sent to the room, not to one
                // participant, so an outbound sample has no remote user to name.
                remoteSpaceUserId: isRequiredString(sample.remoteSpaceUserId) ? sample.remoteSpaceUserId : null,
                spaceName: sample.spaceName,
                streamCategory,
                transportType,
                direction,
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
                // Encoder health describes the sender, so it is meaningless on an inbound
                // sample: read it only where the browser actually reported it.
                qualityLimitationReason:
                    direction === "outbound" ? toLimitationReason(sample.qualityLimitationReason) : null,
                encoderImplementation: direction === "outbound" ? (sample.encoderImplementation ?? null) : null,
                sampleSeq: sample.sampleSeq ?? null,
            },
        };
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

function toTransportType(transportType: VideoQualityTransportType): "P2P" | "SFU" | undefined {
    if (transportType === VideoQualityTransportType.VIDEO_QUALITY_TRANSPORT_TYPE_P2P) {
        return "P2P";
    }
    // The catalog names the transport by topology, not by vendor.
    if (transportType === VideoQualityTransportType.VIDEO_QUALITY_TRANSPORT_TYPE_LIVEKIT) {
        return "SFU";
    }
    return undefined;
}

function toDirection(direction: VideoQualityStreamDirection | undefined): "inbound" | "outbound" {
    // Inbound is the zero value: a sample that names no direction measures a stream we receive.
    return direction === VideoQualityStreamDirection.VIDEO_QUALITY_STREAM_DIRECTION_OUTBOUND ? "outbound" : "inbound";
}

function toLimitationReason(
    reason: VideoQualityLimitationReason | undefined,
): "none" | "cpu" | "bandwidth" | "other" | null {
    switch (reason) {
        case VideoQualityLimitationReason.VIDEO_QUALITY_LIMITATION_REASON_NONE:
            return "none";
        case VideoQualityLimitationReason.VIDEO_QUALITY_LIMITATION_REASON_CPU:
            return "cpu";
        case VideoQualityLimitationReason.VIDEO_QUALITY_LIMITATION_REASON_BANDWIDTH:
            return "bandwidth";
        case VideoQualityLimitationReason.VIDEO_QUALITY_LIMITATION_REASON_OTHER:
            return "other";
        default:
            return null;
    }
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

/**
 * Documented here, next to the sender, because Swagger scrapes this package and
 * not the shared library that does the POST.
 *
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
export const analyticsEventsQueue = new AnalyticsEventsQueue(buildDefaultConfig());

// Declared here rather than listed in server.ts: what this queue holds and how it
// lets go of it is this file's business, and a service that forgets to say so
// loses its buffer on every deploy without anything failing.
registerDrainableService({
    name: "the generic analytics queue",
    drain: (timeoutMs) => analyticsEventsQueue.drain(timeoutMs),
    stop: () => analyticsEventsQueue.stop(),
});
