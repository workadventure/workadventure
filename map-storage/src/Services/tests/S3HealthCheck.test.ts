import type { S3 } from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";
import { S3HealthCheck } from "../S3HealthCheck";

const okS3 = () => ({ send: vi.fn().mockResolvedValue({}) }) as unknown as S3;
const failingS3 = () => ({ send: vi.fn().mockRejectedValue(new Error("connection timeout")) }) as unknown as S3;

type ProbeMock = { send: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> };
const probeReachable = (): ProbeMock => ({ send: vi.fn().mockResolvedValue({}), destroy: vi.fn() });
const probeUnreachable = (): ProbeMock => ({
    send: vi.fn().mockRejectedValue(new Error("connection timeout")),
    destroy: vi.fn(),
});

describe("S3HealthCheck", () => {
    describe("isReachable (readiness)", () => {
        it("is true when the shared pool answers", async () => {
            const hc = new S3HealthCheck(okS3(), "bucket", () => probeReachable() as unknown as S3);
            expect(await hc.isReachable()).toBe(true);
        });

        it("is false when the shared pool fails", async () => {
            const hc = new S3HealthCheck(failingS3(), "bucket", () => probeReachable() as unknown as S3);
            expect(await hc.isReachable()).toBe(false);
        });
    });

    describe("isWedged (liveness)", () => {
        it("is false while the shared pool answers, without issuing a fresh probe", async () => {
            const probe = probeReachable();
            const hc = new S3HealthCheck(okS3(), "bucket", () => probe as unknown as S3);
            expect(await hc.isWedged()).toBe(false);
            expect(probe.send).not.toHaveBeenCalled();
        });

        it("is true when the shared pool fails but a fresh pool reaches S3 (restart-worthy)", async () => {
            const probe = probeReachable();
            const hc = new S3HealthCheck(failingS3(), "bucket", () => probe as unknown as S3);
            expect(await hc.isWedged()).toBe(true);
            expect(probe.send).toHaveBeenCalledOnce();
            expect(probe.destroy).toHaveBeenCalledOnce(); // throwaway client is always cleaned up
        });

        it("is false during a real S3 outage (fresh pool also fails), and cleans up the probe client", async () => {
            const probe = probeUnreachable();
            const hc = new S3HealthCheck(failingS3(), "bucket", () => probe as unknown as S3);
            expect(await hc.isWedged()).toBe(false);
            expect(probe.destroy).toHaveBeenCalledOnce();
        });
    });
});
