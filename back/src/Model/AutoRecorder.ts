import * as Sentry from "@sentry/node";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { isMapDetailsData, type MicrophoneTrackPublishedMessage, type SpaceUser } from "@workadventure/messages";
import { S3Upload } from "livekit-server-sdk";
import {
    ADMIN_API_URL,
    AUTO_RECORDING_ENABLED,
    LIVEKIT_RECORDING_S3_ACCESS_KEY,
    LIVEKIT_RECORDING_S3_BUCKET,
    LIVEKIT_RECORDING_S3_ENDPOINT,
    LIVEKIT_RECORDING_S3_REGION,
    LIVEKIT_RECORDING_S3_SECRET_KEY,
} from "../Enum/EnvironmentVariable";
import { adminApi } from "../Services/AdminApi";
import type { ICommunicationSpace } from "./Interfaces/ICommunicationSpace";
import type { EgressFile, IAutoRecordableState, ICommunicationState } from "./Interfaces/ICommunicationState";
import type { ICommunicationStrategy } from "./Interfaces/ICommunicationStrategy";
import type { OpenedSession } from "./SessionAnalytics";

/** Where the automatic recordings go in the LiveKit recordings bucket, apart from the recordings users start. */
const FOLDER = "auto-recordings";
/** How long a room's answer is reused: every space's first join would call the admin otherwise. */
const ROOM_FLAG_TTL_MS = 60_000;
const roomFlags = new Map<string, { enabled: Promise<boolean>; value?: boolean; expiresAtMs: number }>();

/**
 * Whether a room's spaces are recorded automatically. The admin answers per room, in its map details (/api/map);
 * without an admin, AUTO_RECORDING_ENABLED applies to every room. Never without the LiveKit recordings bucket, which
 * also spares the admin call on a back that does not record.
 *
 * A boolean when the answer is known now (no admin to ask, or the room asked less than a minute ago): the caller
 * then decides within the same handler, and only the first space of a room waits for the admin.
 */
export function isRoomAutoRecorded(playUri: string): boolean | Promise<boolean> {
    if (!LIVEKIT_RECORDING_S3_BUCKET) {
        return false;
    }
    if (!ADMIN_API_URL) {
        return AUTO_RECORDING_ENABLED;
    }
    const roomUrl = playUri.split(/[?#]/)[0];
    const cached = roomFlags.get(roomUrl);
    if (cached && cached.expiresAtMs > Date.now()) {
        return cached.value ?? cached.enabled;
    }
    const entry: { enabled: Promise<boolean>; value?: boolean; expiresAtMs: number } = {
        enabled: adminApi
            .fetchMapDetails(roomUrl)
            .then(
                (details) => {
                    const mapDetails = isMapDetailsData.safeParse(details);
                    return mapDetails.success && (mapDetails.data.autoRecording ?? false);
                },
                (error) => {
                    console.error(
                        `Could not tell whether room ${roomUrl} is recorded automatically; it is not:`,
                        error,
                    );
                    Sentry.captureException(error);
                    return false;
                },
            )
            .then((enabled) => {
                entry.value = enabled;
                return enabled;
            }),
        expiresAtMs: Date.now() + ROOM_FLAG_TTL_MS,
    };
    roomFlags.set(roomUrl, entry);
    return entry.enabled;
}

/** The S3 of the LiveKit recordings. */
const bucketUpload = (): S3Upload =>
    new S3Upload({
        endpoint: LIVEKIT_RECORDING_S3_ENDPOINT,
        accessKey: LIVEKIT_RECORDING_S3_ACCESS_KEY,
        secret: LIVEKIT_RECORDING_S3_SECRET_KEY,
        region: LIVEKIT_RECORDING_S3_REGION,
        bucket: LIVEKIT_RECORDING_S3_BUCKET,
        forcePathStyle: true,
    });

export type ManifestWriter = (key: string, manifest: object) => Promise<void>;

let s3Client: S3Client | undefined;
const writeManifestToBucket: ManifestWriter = async (key, manifest) => {
    s3Client ??= new S3Client({
        endpoint: LIVEKIT_RECORDING_S3_ENDPOINT,
        region: LIVEKIT_RECORDING_S3_REGION || "us-east-1",
        forcePathStyle: true,
        credentials:
            LIVEKIT_RECORDING_S3_ACCESS_KEY && LIVEKIT_RECORDING_S3_SECRET_KEY
                ? { accessKeyId: LIVEKIT_RECORDING_S3_ACCESS_KEY, secretAccessKey: LIVEKIT_RECORDING_S3_SECRET_KEY }
                : undefined,
    });
    await s3Client.send(
        new PutObjectCommand({
            Bucket: LIVEKIT_RECORDING_S3_BUCKET,
            Key: key,
            Body: JSON.stringify(manifest, null, 2),
            ContentType: "application/json",
        }),
    );
};

/** A path segment any bucket takes. */
const segment = (value: string): string => value.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 100) || "_";

/** The last segment of the room URL: the room's slug, or its map file. */
const roomSegment = (playUri: string): string => {
    try {
        return segment(new URL(playUri).pathname.split("/").filter(Boolean).pop() ?? "");
    } catch {
        return "_";
    }
};

const isAutoRecordable = (
    state: ICommunicationState<ICommunicationStrategy>,
): state is IAutoRecordableState & ICommunicationState<ICommunicationStrategy> => "startTrackEgress" in state;

/** Only conversations are recorded: a broadcast is one voice heard by many. */
const RECORDED_KINDS = new Set<string>(["bubble", "area"]);

type Microphone = { user: SpaceUser; trackSid: string; language: string; noiseSuppression: string };

type TrackRecording = {
    file: string;
    speaker: string;
    trackSid: string;
    language: string;
    noiseSuppression: string;
    requestedAtMs: number;
    stoppedAtMs?: number;
    egressId?: string;
    state: IAutoRecordableState;
};

type Meeting = { session: OpenedSession; folder: string; recordings: TrackRecording[] };

export type AutoRecorderDependencies = {
    resolveRoom?: typeof isRoomAutoRecorded;
    writeManifest?: ManifestWriter;
    nowMs?: () => number;
    /** How long after a meeting the manifest is written: the egresses need that long to report their files. */
    manifestDelayMs?: number;
};

/**
 * Records every microphone of a meeting, each to its own file, when the space's room says so (see
 * `isRoomAutoRecorded`). Independent of the recording a user starts (RecordingManager): neither starts nor stops
 * the other.
 *
 * A meeting is a session as the analytics count it — a bubble or a meeting area with at least two people — so its
 * files go under the id of its meeting.ended row. Each client tells which publication is its microphone; one track
 * egress per publication copies the Opus packets to `auto-recordings/<world>/<room>/<date>/<meeting>/<user uuid>-<ms>.ogg`, and a
 * muted microphone becomes silence, so every file keeps the meeting's timeline. When the meeting ends, a
 * `manifest.json` next to the files says who spoke when, in which language and through which noise suppression.
 */
export class AutoRecorder {
    private enabled = false;
    private resolved = false;
    private readonly microphones = new Map<string, Microphone>();
    private meeting: Meeting | undefined;
    /** What each member's microphone is being recorded to, now. */
    private readonly recordings = new Map<string, TrackRecording>();
    private readonly resolveRoom: typeof isRoomAutoRecorded;
    private readonly writeManifest: ManifestWriter;
    private readonly nowMs: () => number;
    private readonly manifestDelayMs: number;

    constructor(
        private readonly space: Pick<ICommunicationSpace, "world" | "getSpaceName">,
        private readonly currentState: () => ICommunicationState<ICommunicationStrategy>,
        dependencies: AutoRecorderDependencies = {},
    ) {
        this.resolveRoom = dependencies.resolveRoom ?? isRoomAutoRecorded;
        this.writeManifest = dependencies.writeManifest ?? writeManifestToBucket;
        this.nowMs = dependencies.nowMs ?? Date.now;
        this.manifestDelayMs = dependencies.manifestDelayMs ?? 30_000;
    }

    /** Read by the transition policy: a recorded space stays on LiveKit, where the egress records. */
    public get isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Asks when the space's first member comes, by their room URL, once for the space's life: turning the recording
     * off means kicking everyone out of the room. Returns the pending answer, or undefined when `isEnabled` already
     * holds it.
     */
    public resolve(playUri: string): Promise<void> | undefined {
        if (this.resolved) {
            return undefined;
        }
        this.resolved = true;
        const answer = this.resolveRoom(playUri);
        if (typeof answer === "boolean") {
            this.enabled = answer;
            return undefined;
        }
        return answer.then((enabled) => {
            this.enabled = enabled;
        });
    }

    public microphonePublished(user: SpaceUser, message: MicrophoneTrackPublishedMessage): void {
        if (!this.enabled) {
            return;
        }
        this.microphones.set(user.spaceUserId, {
            user,
            trackSid: message.trackSid,
            language: message.language,
            noiseSuppression: message.noiseSuppression,
        });
        this.record(user.spaceUserId);
    }

    public userLeft(spaceUserId: string): void {
        this.microphones.delete(spaceUserId);
        this.stop(spaceUserId);
    }

    public sessionChanged(session: OpenedSession | undefined): void {
        if (session) {
            this.open(session);
        } else {
            this.close();
        }
    }

    private open(session: OpenedSession): void {
        if (!this.enabled || !RECORDED_KINDS.has(session.kind)) {
            return;
        }
        const date = new Date(session.openedAtMs).toISOString().slice(0, 10);
        this.meeting = {
            session,
            folder: [FOLDER, segment(this.space.world), roomSegment(session.roomId), date, session.eventId].join("/"),
            recordings: [],
        };
        for (const spaceUserId of this.microphones.keys()) {
            this.record(spaceUserId);
        }
    }

    private close(): void {
        const meeting = this.meeting;
        if (!meeting) {
            return;
        }
        for (const spaceUserId of [...this.recordings.keys()]) {
            this.stop(spaceUserId);
        }
        this.meeting = undefined;
        const endedAtMs = this.nowMs();
        setTimeout(() => {
            this.writeManifestOf(meeting, endedAtMs).catch((error) => {
                console.error(`Could not write the manifest of meeting ${meeting.folder}:`, error);
                Sentry.captureException(error);
            });
        }, this.manifestDelayMs);
    }

    private record(spaceUserId: string): void {
        const meeting = this.meeting;
        const microphone = this.microphones.get(spaceUserId);
        if (!meeting || !microphone || this.recordings.get(spaceUserId)?.trackSid === microphone.trackSid) {
            return;
        }
        // A new publication (a reconnection): the egress of the previous one ended with its track.
        this.stop(spaceUserId);
        const state = this.currentState();
        if (!isAutoRecordable(state)) {
            return;
        }
        const requestedAtMs = this.nowMs();
        const speaker = microphone.user.uuid;
        const recording: TrackRecording = {
            file: `${meeting.folder}/${segment(speaker)}-${requestedAtMs}.ogg`,
            speaker,
            trackSid: microphone.trackSid,
            language: microphone.language,
            noiseSuppression: microphone.noiseSuppression,
            requestedAtMs,
            state,
        };
        meeting.recordings.push(recording);
        this.recordings.set(spaceUserId, recording);
        state.startTrackEgress(spaceUserId, microphone.trackSid, recording.file, bucketUpload()).then(
            (egressId) => {
                recording.egressId = egressId;
                if (recording.stoppedAtMs !== undefined) {
                    // Stopped while it was starting: now it has an id to stop.
                    this.stopEgress(recording);
                }
            },
            (error) => {
                // Best effort: the meeting goes on, unrecorded for this microphone.
                console.warn(
                    `Could not record the microphone of ${spaceUserId} in ${this.space.getSpaceName()}:`,
                    error,
                );
                if (this.recordings.get(spaceUserId) === recording) {
                    this.recordings.delete(spaceUserId);
                }
            },
        );
    }

    private stop(spaceUserId: string): void {
        const recording = this.recordings.get(spaceUserId);
        if (!recording) {
            return;
        }
        this.recordings.delete(spaceUserId);
        recording.stoppedAtMs = this.nowMs();
        this.stopEgress(recording);
    }

    private stopEgress(recording: TrackRecording): void {
        if (!recording.egressId) {
            return;
        }
        // Often already over: the egress ends by itself with its track, and the room with the meeting.
        recording.state.stopEgress(recording.egressId).catch((error) => {
            console.debug(`Egress ${recording.egressId} was not stopped (it may have ended already):`, error);
        });
    }

    private async writeManifestOf(meeting: Meeting, endedAtMs: number): Promise<void> {
        const recorded = meeting.recordings.filter(
            (recording): recording is TrackRecording & { egressId: string } => recording.egressId !== undefined,
        );
        if (recorded.length === 0) {
            return;
        }
        const files = await Promise.all(
            recorded.map((recording) =>
                recording.state.getEgressFile(recording.egressId).catch((error): EgressFile | undefined => {
                    console.warn(`Could not read the file of egress ${recording.egressId}:`, error);
                    return undefined;
                }),
            ),
        );
        const iso = (ms: number) => new Date(ms).toISOString();
        await this.writeManifest(`${meeting.folder}/manifest.json`, {
            meetingId: meeting.session.eventId,
            world: this.space.world,
            room: meeting.session.roomId,
            kind: meeting.session.kind,
            startedAt: iso(meeting.session.openedAtMs),
            endedAt: iso(endedAtMs),
            tracks: recorded.map((recording, index) => {
                const file = files[index];
                // The egress's own start when it reported it: the first packet comes a second or two after the
                // request, and the speakers are only aligned on what each file really holds.
                const startedAtMs = file?.startedAtMs ?? recording.requestedAtMs;
                return {
                    file: recording.file,
                    speaker: recording.speaker,
                    egressId: recording.egressId,
                    trackSid: recording.trackSid,
                    codec: "opus",
                    language: recording.language,
                    noiseSuppression: recording.noiseSuppression,
                    startedAt: iso(startedAtMs),
                    offsetSeconds: (startedAtMs - meeting.session.openedAtMs) / 1000,
                    durationSeconds: file ? file.durationMs / 1000 : null,
                    timesFromEgress: file !== undefined,
                };
            }),
        });
    }
}
