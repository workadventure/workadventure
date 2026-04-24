import { describe, expect, it, vi } from "vitest";
import type { EgressInfo } from "livekit-server-sdk";
import { EgressStatus } from "livekit-server-sdk";
import { LiveKitService } from "../src/Model/Services/LivekitService";

function createService(stopEgress = vi.fn(), startRoomCompositeEgress = vi.fn()) {
    return new LiveKitService(
        "http://livekit.local",
        "api-key",
        "api-secret",
        "ws://livekit.local",
        "https://play.local",
        "webhook-key",
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
                        signingKey: "webhook-key",
                    }),
                ],
            })
        );
        expect(getTrackedRecordings(service).has("egress-1")).toBe(true);
    });
});
