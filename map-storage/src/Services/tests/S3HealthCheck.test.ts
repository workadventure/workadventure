import type { S3 } from "@aws-sdk/client-s3";
import * as Sentry from "@sentry/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { S3HealthCheck } from "../S3HealthCheck";

vi.mock("@sentry/node", () => ({
    captureException: vi.fn(),
}));

const okS3 = () => ({ send: vi.fn().mockResolvedValue({}) }) as unknown as S3;
const failingS3 = () => ({ send: vi.fn().mockRejectedValue(new Error("connection timeout")) }) as unknown as S3;

type ProbeMock = { send: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> };
const probeReachable = (): ProbeMock => ({ send: vi.fn().mockResolvedValue({}), destroy: vi.fn() });
const probeUnreachable = (): ProbeMock => ({
    send: vi.fn().mockRejectedValue(new Error("connection timeout")),
    destroy: vi.fn(),
});

describe("S3HealthCheck", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.mocked(Sentry.captureException).mockClear();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it("stays healthy while probes succeed", async () => {
        const hc = new S3HealthCheck(okS3(), "bucket", 1000, 3, () => probeReachable() as unknown as S3);
        hc.start();
        await vi.advanceTimersByTimeAsync(3000);
        expect(hc.isHealthy()).toBe(true);
        expect(Sentry.captureException).not.toHaveBeenCalled();
        hc.stop();
    });

    it("becomes unhealthy after failureThreshold consecutive failures and alerts exactly once", async () => {
        const hc = new S3HealthCheck(failingS3(), "bucket", 1000, 3, () => probeReachable() as unknown as S3);
        hc.start();

        await vi.advanceTimersByTimeAsync(2000); // 2 failures — still under the threshold
        expect(hc.isHealthy()).toBe(true);

        await vi.advanceTimersByTimeAsync(1000); // 3rd failure — threshold reached
        expect(hc.isHealthy()).toBe(false);

        await vi.advanceTimersByTimeAsync(3000); // keep failing
        expect(Sentry.captureException).toHaveBeenCalledOnce(); // one alert per outage, not per check
        hc.stop();
    });

    it("recovers (and re-arms alerting) after connectivity returns", async () => {
        const send = vi
            .fn()
            .mockRejectedValueOnce(new Error("t"))
            .mockRejectedValueOnce(new Error("t"))
            .mockRejectedValueOnce(new Error("t"))
            .mockResolvedValue({});
        const hc = new S3HealthCheck(
            { send } as unknown as S3,
            "bucket",
            1000,
            3,
            () => probeReachable() as unknown as S3,
        );
        hc.start();

        await vi.advanceTimersByTimeAsync(3000);
        expect(hc.isHealthy()).toBe(false);

        await vi.advanceTimersByTimeAsync(1000); // success → reset
        expect(hc.isHealthy()).toBe(true);
        hc.stop();
    });

    it("isWedged is false while healthy and issues no fresh probe", async () => {
        const probe = probeReachable();
        const hc = new S3HealthCheck(okS3(), "bucket", 1000, 3, () => probe as unknown as S3);
        expect(await hc.isWedged()).toBe(false);
        expect(probe.send).not.toHaveBeenCalled();
    });

    it("isWedged is true when the shared pool fails but a fresh pool reaches S3 (restart-worthy)", async () => {
        const probe = probeReachable();
        const hc = new S3HealthCheck(failingS3(), "bucket", 1000, 3, () => probe as unknown as S3);
        hc.start();
        await vi.advanceTimersByTimeAsync(3000);
        expect(hc.isHealthy()).toBe(false);

        expect(await hc.isWedged()).toBe(true);
        expect(probe.send).toHaveBeenCalledOnce();
        expect(probe.destroy).toHaveBeenCalledOnce(); // throwaway client is always cleaned up
        hc.stop();
    });

    it("isWedged is false during a real S3 outage (fresh pool also fails), no restart", async () => {
        const probe = probeUnreachable();
        const hc = new S3HealthCheck(failingS3(), "bucket", 1000, 3, () => probe as unknown as S3);
        hc.start();
        await vi.advanceTimersByTimeAsync(3000);
        expect(hc.isHealthy()).toBe(false);

        expect(await hc.isWedged()).toBe(false);
        expect(probe.destroy).toHaveBeenCalledOnce();
        hc.stop();
    });

    it("start() is a no-op when the period is 0 (disabled)", async () => {
        const s3 = okS3();
        const hc = new S3HealthCheck(s3, "bucket", 0, 3, () => probeReachable() as unknown as S3);
        hc.start();
        await vi.advanceTimersByTimeAsync(60000);
        expect(vi.mocked((s3 as unknown as { send: ReturnType<typeof vi.fn> }).send)).not.toHaveBeenCalled();
    });
});
