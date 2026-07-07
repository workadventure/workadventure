import { ListObjectsV2Command, type S3 } from "@aws-sdk/client-s3";
import * as Sentry from "@sentry/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { S3HealthCheck } from "../S3HealthCheck";

vi.mock("@sentry/node", () => ({ captureException: vi.fn() }));

describe("S3HealthCheck", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        vi.spyOn(console, "error").mockImplementation(() => {});
        vi.spyOn(console, "info").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("alerts once after the configured number of consecutive failures", async () => {
        const send = vi.fn().mockRejectedValue(new Error("timeout"));
        const check = new S3HealthCheck({ send } as unknown as S3, "bucket", 1000, 3);
        check.start();

        // Two failures: still below the threshold, no alert.
        await vi.advanceTimersByTimeAsync(2000);
        expect(check.isHealthy()).toBe(true);
        expect(Sentry.captureException).not.toHaveBeenCalled();

        // Third failure: threshold reached, a single alert is emitted.
        await vi.advanceTimersByTimeAsync(1000);
        expect(check.isHealthy()).toBe(false);
        expect(Sentry.captureException).toHaveBeenCalledOnce();

        // Further failures do not spam: still a single alert for this outage.
        await vi.advanceTimersByTimeAsync(3000);
        expect(Sentry.captureException).toHaveBeenCalledOnce();

        // The probe uses a cheap ListObjectsV2 call on the shared client.
        expect(send.mock.calls[0]?.[0]).toBeInstanceOf(ListObjectsV2Command);
        check.stop();
    });

    it("re-arms the alert after connectivity recovers", async () => {
        const send = vi
            .fn()
            .mockRejectedValueOnce(new Error("t"))
            .mockRejectedValueOnce(new Error("t"))
            .mockRejectedValueOnce(new Error("t")) // 3 failures -> alert #1
            .mockResolvedValueOnce({}) // recovery
            .mockRejectedValue(new Error("t")); // failing again
        const check = new S3HealthCheck({ send } as unknown as S3, "bucket", 1000, 3);
        check.start();

        await vi.advanceTimersByTimeAsync(3000);
        expect(Sentry.captureException).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(1000);
        expect(check.isHealthy()).toBe(true);

        await vi.advanceTimersByTimeAsync(3000);
        expect(Sentry.captureException).toHaveBeenCalledTimes(2);
        check.stop();
    });

    it("does not run when the period is 0 (disabled)", async () => {
        const send = vi.fn().mockRejectedValue(new Error("t"));
        const check = new S3HealthCheck({ send } as unknown as S3, "bucket", 0, 3);
        check.start();

        await vi.advanceTimersByTimeAsync(10000);
        expect(send).not.toHaveBeenCalled();
        expect(check.isHealthy()).toBe(true);
        check.stop();
    });
});
