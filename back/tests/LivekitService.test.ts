import { describe, expect, it, vi } from "vitest";
import { RecordingWebhookPhase } from "@workadventure/messages";
import type { EgressInfo } from "livekit-server-sdk";
import type { DirectFileOutput } from "livekit-server-sdk";
import { EgressStatus, S3Upload, TrackSource } from "livekit-server-sdk";
import type { LivekitWebhookError } from "../src/Model/Services/LivekitService";
import { LiveKitService } from "../src/Model/Services/LivekitService";

function createService(stopEgress = vi.fn(), startRoomCompositeEgress = vi.fn(), receive = vi.fn()) {
    return new LiveKitService(
        "http://livekit.local",
        "api-key",
        "api-secret",
        "ws://livekit.local",
        "https://play.local",
        () =>
            ({
                listRooms: vi.fn(),
                createRoom: vi.fn(),
                deleteRoom: vi.fn(),
            } as never),
        () =>
            ({
                stopEgress,
                startRoomCompositeEgress,
            } as never),
        () =>
            ({
                receive,
            } as never)
    );
}

function trackRecording(service: LiveKitService, recording: Partial<EgressInfo> & { egressId: string }) {
    (
        service as unknown as {
            activeRecordings: Map<string, EgressInfo>;
        }
    ).activeRecordings.set(recording.egressId, recording as EgressInfo);
}

function getTrackedRecordings(service: LiveKitService): Map<string, EgressInfo> {
    return (service as unknown as { activeRecordings: Map<string, EgressInfo> }).activeRecordings;
}

describe("LiveKitService", () => {
    it("ignores stop when the targeted egress is already complete locally", async () => {
        const stopEgress = vi.fn();
        const service = createService(stopEgress);

        trackRecording(service, {
            egressId: "egress-1",
            status: EgressStatus.EGRESS_COMPLETE,
        });

        await expect(service.stopRecording("egress-1")).resolves.toBeUndefined();
        expect(stopEgress).not.toHaveBeenCalled();
        expect(getTrackedRecordings(service).size).toBe(0);
    });

    it("treats terminal egress errors as an idempotent stop", async () => {
        const stopEgress = vi.fn().mockRejectedValue(new Error("egress is already in state EGRESS_COMPLETE"));
        const service = createService(stopEgress);

        trackRecording(service, {
            egressId: "egress-1",
            status: EgressStatus.EGRESS_ACTIVE,
        });

        await expect(service.stopRecording("egress-1")).resolves.toBeUndefined();
        expect(stopEgress).toHaveBeenCalledWith("egress-1");
        expect(getTrackedRecordings(service).size).toBe(0);
    });

    it("rethrows non-terminal stop errors", async () => {
        const stopEgress = vi.fn().mockRejectedValue(new Error("network timeout"));
        const service = createService(stopEgress);

        trackRecording(service, {
            egressId: "egress-1",
            status: EgressStatus.EGRESS_ACTIVE,
        });

        await expect(service.stopRecording("egress-1")).rejects.toThrow("network timeout");
        expect(getTrackedRecordings(service).has("egress-1")).toBe(true);
    });

    it("stops an explicit egress id even when the local tracking map is not hydrated yet", async () => {
        const stopEgress = vi.fn().mockResolvedValue(undefined);
        const service = createService(stopEgress);

        await expect(service.stopRecording("egress-early")).resolves.toBeUndefined();
        expect(stopEgress).toHaveBeenCalledWith("egress-early");
    });

    it("requires an explicit egressId when multiple recordings are tracked", async () => {
        const stopEgress = vi.fn();
        const service = createService(stopEgress);

        trackRecording(service, { egressId: "egress-1", status: EgressStatus.EGRESS_ACTIVE });
        trackRecording(service, { egressId: "egress-2", status: EgressStatus.EGRESS_ACTIVE });

        await expect(service.stopRecording()).rejects.toThrow(
            "Multiple active recordings found; egressId is required to stop a specific recording"
        );
        expect(stopEgress).not.toHaveBeenCalled();
    });

    it("passes webhook configuration with the recording session id when starting a recording", async () => {
        const startRoomCompositeEgress = vi.fn().mockResolvedValue({
            egressId: "egress-1",
            roomName: "test-space",
        });
        const service = createService(vi.fn(), startRoomCompositeEgress);

        const result = await service.startRecording(
            "test-space",
            {
                spaceUserId: "user-1",
                uuid: "uuid-1",
                name: "User 1",
            } as never,
            "folder-name",
            "session-1"
        );

        expect(result).toEqual({
            egressId: "egress-1",
            roomName: "test-space",
        });
        expect(startRoomCompositeEgress).toHaveBeenCalledWith(
            "test-space",
            expect.any(Object),
            expect.objectContaining({
                layout: "grid",
                webhooks: [
                    expect.objectContaining({
                        url: "https://play.local/livekit/egress/webhook?space=test-space&recordingSessionId=session-1",
                        signingKey: "api-key",
                    }),
                ],
            })
        );
        expect(getTrackedRecordings(service).has("egress-1")).toBe(true);
    });

    it("normalizes signed LiveKit egress webhooks into recording webhook requests", async () => {
        const receive = vi.fn().mockResolvedValue({
            event: "egress_ended",
            id: "event-1",
            createdAt: 1234n,
            egressInfo: {
                egressId: "egress-1",
                roomName: "test-space",
                status: EgressStatus.EGRESS_ABORTED,
                error: "egress stopped remotely",
                // LiveKit reports nanoseconds.
                startedAt: 1_700_000_000_000_000_000n,
                endedAt: 1_700_000_610_000_000_000n,
                fileResults: [
                    {
                        filename: "recorder-uuid/recording-2023-11-14T22:13:20.mp4",
                        size: 4_096n,
                        duration: 610_400_000_000n,
                    },
                ],
            },
        });
        const service = createService(vi.fn(), vi.fn(), receive);

        const result = await service.handleLivekitWebhook(Buffer.from("{}"), "jwt-token", "space-name", "session-1");

        expect(receive).toHaveBeenCalledWith("{}", "jwt-token");
        expect(result).toMatchObject({
            spaceName: "space-name",
            eventId: "event-1",
            recordingSessionId: "session-1",
            egressId: "egress-1",
            roomName: "test-space",
            phase: RecordingWebhookPhase.RECORDING_WEBHOOK_PHASE_ENDED,
            status: "EGRESS_ABORTED",
            error: "egress stopped remotely",
            createdAt: 1234,
            startedAtMs: 1_700_000_000_000,
            endedAtMs: 1_700_000_610_000,
            fileResults: [
                { filename: "recorder-uuid/recording-2023-11-14T22:13:20.mp4", sizeBytes: 4096, durationMs: 610_400 },
            ],
        });
    });

    it("leaves timestamps at zero and files empty when LiveKit reports none", async () => {
        const receive = vi.fn().mockResolvedValue({
            event: "egress_started",
            id: "event-2",
            createdAt: 1n,
            egressInfo: { egressId: "egress-1", roomName: "test-space", status: EgressStatus.EGRESS_ACTIVE },
        });
        const service = createService(vi.fn(), vi.fn(), receive);

        const result = await service.handleLivekitWebhook(Buffer.from("{}"), "jwt-token", "space-name", "session-1");

        expect(result).toMatchObject({
            phase: RecordingWebhookPhase.RECORDING_WEBHOOK_PHASE_STARTED,
            startedAtMs: 0,
            endedAtMs: 0,
            fileResults: [],
        });
    });

    it("ignores signed LiveKit events that do not describe egress lifecycle", async () => {
        const receive = vi.fn().mockResolvedValue({
            event: "participant_joined",
            id: "event-1",
            createdAt: 1234n,
        });
        const service = createService(vi.fn(), vi.fn(), receive);

        await expect(
            service.handleLivekitWebhook(Buffer.from("{}"), "jwt-token", "space-name", "session-1")
        ).resolves.toBe("ignored");
    });

    it("classifies LiveKit signature errors as unauthorized webhook errors", async () => {
        const receive = vi.fn().mockRejectedValue(new Error("sha256 checksum of body does not match"));
        const service = createService(vi.fn(), vi.fn(), receive);

        await expect(
            service.handleLivekitWebhook(Buffer.from("{}"), "jwt-token", "space-name", "session-1")
        ).rejects.toMatchObject({
            kind: "unauthorized",
        } satisfies Partial<LivekitWebhookError>);
    });
});

describe("LiveKitService track egress", () => {
    function createTrackEgressService(tracks: { sid: string; source: TrackSource }[]) {
        const startTrackEgress = vi.fn((_roomName: string, _output: DirectFileOutput, _trackId: string) =>
            Promise.resolve({ egressId: "EG_track" })
        );
        const service = new LiveKitService(
            "http://livekit.local",
            "api-key",
            "api-secret",
            "ws://livekit.local",
            "https://play.local",
            () => ({ getParticipant: vi.fn().mockResolvedValue({ tracks }) } as never),
            () => ({ startTrackEgress } as never),
            () => ({ receive: vi.fn() })
        );
        return { service, startTrackEgress };
    }

    it("records the participant's microphone to its own file in the bucket", async () => {
        const { service, startTrackEgress } = createTrackEgressService([
            { sid: "TR_mic", source: TrackSource.MICROPHONE },
        ]);

        await expect(
            service.startTrackEgress("space", "user-1", "TR_mic", "folder/speaker.ogg", new S3Upload({ bucket: "audio" }))
        ).resolves.toBe("EG_track");

        const [roomName, output, trackId] = startTrackEgress.mock.calls[0];
        expect(roomName).toBe("space");
        expect(trackId).toBe("TR_mic");
        expect(output.filepath).toBe("folder/speaker.ogg");
        expect(output.output).toMatchObject({ case: "s3", value: { bucket: "audio" } });
    });

    it("refuses a track that is not the participant's microphone", async () => {
        const { service, startTrackEgress } = createTrackEgressService([
            { sid: "TR_camera", source: TrackSource.CAMERA },
        ]);

        await expect(
            service.startTrackEgress("space", "user-1", "TR_camera", "folder/speaker.ogg", new S3Upload({}))
        ).rejects.toThrow("is not the microphone");
        expect(startTrackEgress).not.toHaveBeenCalled();
    });
});

describe("LiveKitService egress times", () => {
    function createServiceListing(egresses: unknown[]) {
        return new LiveKitService(
            "http://livekit.local",
            "api-key",
            "api-secret",
            "ws://livekit.local",
            "https://play.local",
            () => ({} as never),
            () => ({ listEgress: vi.fn().mockResolvedValue(egresses) } as never),
            () => ({ receive: vi.fn() })
        );
    }

    it("reports the egress's own start and end, which bracket its file", async () => {
        const service = createServiceListing([
            {
                startedAt: 1_000_000_000_000n,
                endedAt: 1_049_000_000_000n,
                // The file's startedAt comes seconds after its first sample: not the one to align on
                fileResults: [{ startedAt: 1_003_000_000_000n, endedAt: 1_049_000_000_000n, duration: 46_000_000_000n }],
            },
        ]);

        await expect(service.getEgressFile("EG_1")).resolves.toEqual({
            startedAtMs: 1_000_000,
            endedAtMs: 1_049_000,
            durationMs: 49_000,
        });
    });

    it("reports nothing for an egress that has not ended", async () => {
        const service = createServiceListing([{ startedAt: 1_000_000_000_000n, endedAt: 0n, fileResults: [] }]);

        await expect(service.getEgressFile("EG_1")).resolves.toBeUndefined();
    });
});
