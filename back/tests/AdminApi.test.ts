import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios, { AxiosError, AxiosHeaders } from "axios";
import type { RecordingEventPayload } from "../src/Services/AdminApi";

vi.mock("../src/Enum/EnvironmentVariable", () => ({
    ADMIN_API_URL: "http://admin.test/",
    ADMIN_API_TOKEN: "admin-token",
}));

const { adminApi } = await import("../src/Services/AdminApi");

const payload: RecordingEventPayload = {
    phase: "ended",
    status: "EGRESS_COMPLETE",
    egressId: "egress-1",
    recordingSessionId: "session-1",
    playUri: "http://play.test/@/team/world/room",
    recorder: { uuid: "recorder-uuid", spaceUserId: "1" },
    startedAt: "2023-11-14T22:13:20.000Z",
    endedAt: "2023-11-14T22:23:30.000Z",
    error: null,
    files: [{ filename: "recorder-uuid/recording-1.mp4", sizeBytes: 123, durationSeconds: 610 }],
};

function httpError(status: number): AxiosError {
    return new AxiosError("failed", "ERR_BAD_RESPONSE", undefined, undefined, {
        status,
        statusText: "",
        data: {},
        headers: {},
        config: { headers: new AxiosHeaders() },
    });
}

describe("AdminApi.notifyRecordingEvent", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it("posts the payload to the admin recordings endpoint with the admin token", async () => {
        const post = vi.spyOn(axios, "post");
        post.mockResolvedValue({ status: 202 });

        await adminApi.notifyRecordingEvent(payload);

        expect(post).toHaveBeenCalledTimes(1);
        expect(post).toHaveBeenCalledWith(
            "http://admin.test/api/recordings/events",
            payload,
            expect.objectContaining({
                headers: expect.objectContaining({ Authorization: "admin-token" }),
            }),
        );
    });

    it("retries transport and server errors, then gives up", async () => {
        const post = vi.spyOn(axios, "post");
        post.mockRejectedValue(httpError(503));

        const promise = adminApi.notifyRecordingEvent(payload);
        // Keep the rejection handled while the fake timers advance through the backoff.
        promise.catch(() => undefined);
        await vi.runAllTimersAsync();
        await expect(promise).rejects.toBeInstanceOf(AxiosError);

        expect(post).toHaveBeenCalledTimes(4);
    });

    it("does not retry when the admin rejects the payload", async () => {
        const post = vi.spyOn(axios, "post");
        post.mockRejectedValue(httpError(422));

        await expect(adminApi.notifyRecordingEvent(payload)).rejects.toBeInstanceOf(AxiosError);

        expect(post).toHaveBeenCalledTimes(1);
    });
});
