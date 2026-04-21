import { describe, expect, it, vi } from "vitest";
import { RecordingWebhookPhase } from "@workadventure/messages";
import { EgressStatus } from "livekit-server-sdk";
import { LivekitWebhookService } from "./LivekitWebhookService";

describe("LivekitWebhookService", () => {
    it("forwards normalized egress webhooks to the correct back", async () => {
        let capturedRequest: unknown;
        const handleRecordingWebhook = vi.fn((request, _metadata, callback) => {
            capturedRequest = request;
            callback(null);
        });
        const getSpaceClient = vi.fn().mockResolvedValue({
            handleRecordingWebhook,
        });
        const receive = vi.fn().mockResolvedValue({
            event: "egress_ended",
            id: "event-1",
            createdAt: 1234n,
            egressInfo: {
                egressId: "egress-1",
                roomName: "livekit-room",
                status: EgressStatus.EGRESS_ABORTED,
                error: "egress stopped remotely",
            },
        });

        const service = new LivekitWebhookService({ getSpaceClient }, 1024, "api-key", "api-secret", () => ({
            receive,
        }));

        const result = await service.handleWebhook(Buffer.from("{}"), "jwt-token", "space-name", "session-1");

        expect(result).toBe("forwarded");
        expect(getSpaceClient).toHaveBeenCalledWith("space-name", 1024);
        expect(handleRecordingWebhook).toHaveBeenCalledTimes(1);
        expect(capturedRequest).toMatchObject({
            spaceName: "space-name",
            eventId: "event-1",
            recordingSessionId: "session-1",
            egressId: "egress-1",
            roomName: "livekit-room",
            phase: RecordingWebhookPhase.RECORDING_WEBHOOK_PHASE_ENDED,
            status: "EGRESS_ABORTED",
            error: "egress stopped remotely",
            createdAt: 1234,
        });
    });

    it("ignores non-egress lifecycle events", async () => {
        const getSpaceClient = vi.fn();
        const receive = vi.fn().mockResolvedValue({
            event: "participant_joined",
            id: "event-1",
            createdAt: 1234n,
        });

        const service = new LivekitWebhookService({ getSpaceClient }, 1024, "api-key", "api-secret", () => ({
            receive,
        }));

        await expect(service.handleWebhook(Buffer.from("{}"), "jwt-token", "space-name", "session-1")).resolves.toBe(
            "ignored"
        );
        expect(getSpaceClient).not.toHaveBeenCalled();
    });

    it("rejects invalid signatures", async () => {
        const service = new LivekitWebhookService({ getSpaceClient: vi.fn() }, 1024, "api-key", "api-secret", () => ({
            receive: vi.fn().mockRejectedValue(new Error("sha256 checksum of body does not match")),
        }));

        await expect(
            service.handleWebhook(Buffer.from("{}"), "jwt-token", "space-name", "session-1")
        ).rejects.toMatchObject({
            statusCode: 401,
        });
    });

    it("rejects missing recordingSessionId query parameters", async () => {
        const service = new LivekitWebhookService({ getSpaceClient: vi.fn() }, 1024, "api-key", "api-secret", () => ({
            receive: vi.fn(),
        }));

        await expect(
            service.handleWebhook(Buffer.from("{}"), "jwt-token", "space-name", undefined)
        ).rejects.toMatchObject({
            statusCode: 400,
        });
    });
});
