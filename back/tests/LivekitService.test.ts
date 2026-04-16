import { describe, expect, it, vi } from "vitest";
import type { EgressInfo } from "livekit-server-sdk";
import { EgressStatus } from "livekit-server-sdk";
import { LiveKitService } from "../src/Model/Services/LivekitService";

describe("LiveKitService", () => {
    it("ignores stop when the current egress is already complete locally", async () => {
        const stopEgress = vi.fn();

        const service = new LiveKitService(
            "http://livekit.local",
            "api-key",
            "api-secret",
            "ws://livekit.local",
            () =>
                ({
                    listRooms: vi.fn(),
                    createRoom: vi.fn(),
                    deleteRoom: vi.fn(),
                } as never),
            () =>
                ({
                    stopEgress,
                } as never)
        );

        (
            service as unknown as {
                currentRecordingInformation: EgressInfo | null;
            }
        ).currentRecordingInformation = {
            egressId: "egress-1",
            status: EgressStatus.EGRESS_COMPLETE,
        } as EgressInfo;

        await expect(service.stopRecording()).resolves.toBeUndefined();
        expect(stopEgress).not.toHaveBeenCalled();
        expect(
            (
                service as unknown as {
                    currentRecordingInformation: EgressInfo | null;
                }
            ).currentRecordingInformation
        ).toBeNull();
    });

    it("treats terminal egress errors as an idempotent stop", async () => {
        const stopEgress = vi.fn().mockRejectedValue(new Error("egress is already in state EGRESS_COMPLETE"));

        const service = new LiveKitService(
            "http://livekit.local",
            "api-key",
            "api-secret",
            "ws://livekit.local",
            () =>
                ({
                    listRooms: vi.fn(),
                    createRoom: vi.fn(),
                    deleteRoom: vi.fn(),
                } as never),
            () =>
                ({
                    stopEgress,
                } as never)
        );

        (
            service as unknown as {
                currentRecordingInformation: EgressInfo | null;
            }
        ).currentRecordingInformation = {
            egressId: "egress-1",
            status: EgressStatus.EGRESS_ACTIVE,
        } as EgressInfo;

        await expect(service.stopRecording()).resolves.toBeUndefined();
        expect(stopEgress).toHaveBeenCalledWith("egress-1");
        expect(
            (
                service as unknown as {
                    currentRecordingInformation: EgressInfo | null;
                }
            ).currentRecordingInformation
        ).toBeNull();
    });

    it("rethrows non-terminal stop errors", async () => {
        const stopEgress = vi.fn().mockRejectedValue(new Error("network timeout"));

        const service = new LiveKitService(
            "http://livekit.local",
            "api-key",
            "api-secret",
            "ws://livekit.local",
            () =>
                ({
                    listRooms: vi.fn(),
                    createRoom: vi.fn(),
                    deleteRoom: vi.fn(),
                } as never),
            () =>
                ({
                    stopEgress,
                } as never)
        );

        (
            service as unknown as {
                currentRecordingInformation: EgressInfo | null;
            }
        ).currentRecordingInformation = {
            egressId: "egress-1",
            status: EgressStatus.EGRESS_ACTIVE,
        } as EgressInfo;

        await expect(service.stopRecording()).rejects.toThrow("network timeout");
        expect(
            (
                service as unknown as {
                    currentRecordingInformation: EgressInfo | null;
                }
            ).currentRecordingInformation
        ).not.toBeNull();
    });
});
