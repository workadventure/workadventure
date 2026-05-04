import { describe, expect, it, vi } from "vitest";
import { status, type ServiceError } from "@grpc/grpc-js";

vi.mock("../enums/EnvironmentVariable", () => import("../../../tests/pusher/mocks/pusherEnvironmentVariableMock"));

import { LivekitWebhookService } from "./LivekitWebhookService";

describe("LivekitWebhookService", () => {
    it("forwards raw LiveKit webhook payloads to the correct back", async () => {
        let capturedRequest: unknown;
        const handleLivekitWebhook = vi.fn((request, _metadata, callback) => {
            capturedRequest = request;
            callback(null);
        });
        const getSpaceClient = vi.fn().mockResolvedValue({
            handleLivekitWebhook,
        });

        const service = new LivekitWebhookService({ getSpaceClient }, 1024);
        const rawBody = Buffer.from('{"event":"egress_ended"}');

        const result = await service.handleWebhook(rawBody, "jwt-token", "space-name", "session-1");

        expect(result).toBe("forwarded");
        expect(getSpaceClient).toHaveBeenCalledWith("space-name", 1024);
        expect(handleLivekitWebhook).toHaveBeenCalledTimes(1);
        expect(capturedRequest).toMatchObject({
            spaceName: "space-name",
            recordingSessionId: "session-1",
            authorizationHeader: "jwt-token",
        });
        expect(Buffer.from((capturedRequest as { rawBody: Uint8Array }).rawBody).toString("utf-8")).toBe(
            rawBody.toString("utf-8")
        );
    });

    it("rejects missing webhook bodies before forwarding to the back", async () => {
        const getSpaceClient = vi.fn();
        const service = new LivekitWebhookService({ getSpaceClient }, 1024);

        await expect(
            service.handleWebhook(Buffer.alloc(0), "jwt-token", "space-name", "session-1")
        ).rejects.toMatchObject({
            statusCode: 400,
        });
        expect(getSpaceClient).not.toHaveBeenCalled();
    });

    it("maps back signature failures to unauthorized HTTP errors", async () => {
        const handleLivekitWebhook = vi.fn((_request, _metadata, callback) => {
            callback({
                code: status.UNAUTHENTICATED,
                message: "sha256 checksum of body does not match",
            } as ServiceError);
        });
        const service = new LivekitWebhookService(
            {
                getSpaceClient: vi.fn().mockResolvedValue({ handleLivekitWebhook }),
            },
            1024
        );

        await expect(
            service.handleWebhook(Buffer.from("{}"), "jwt-token", "space-name", "session-1")
        ).rejects.toMatchObject({
            statusCode: 401,
        });
    });
});
