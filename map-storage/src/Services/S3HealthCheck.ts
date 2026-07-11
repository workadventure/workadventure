import type { S3 } from "@aws-sdk/client-s3";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import * as Sentry from "@sentry/node";

/**
 * Periodically checks that the map-storage process can still reach S3, using the *shared* S3
 * client (and therefore the shared HTTP connection pool).
 *
 * This detects the "S3 HTTP agent connection pool exhausted" failure mode
 * (see INCIDENT_map-storage_s3_agent_exhaustion): when the pool is wedged, every S3 call —
 * including this probe — times out at the connection timeout. A run of consecutive failures is a
 * reliable signal for a condition that otherwise stays invisible until users start hitting HTTP
 * 500s.
 *
 * Two verdicts are exposed:
 *  - {@link isHealthy} drives the **readiness** probe: false after `failureThreshold` consecutive
 *    failed checks, which pulls the pod out of the load-balancer.
 *  - {@link isWedged} drives the **liveness** probe: true only when the shared pool is failing AND
 *    a probe through a *fresh* connection pool succeeds — i.e. S3 is reachable but our pool is
 *    wedged, so a restart will fix it. During a genuine S3 outage the fresh probe also fails, so
 *    liveness stays healthy and the pod is not restarted into a crash loop.
 */
export class S3HealthCheck {
    private consecutiveFailures = 0;
    private alerting = false;
    private timer: NodeJS.Timeout | undefined;

    constructor(
        private readonly s3: S3,
        private readonly bucketName: string,
        private readonly periodMs: number,
        private readonly failureThreshold: number,
        private readonly createProbeClient: () => S3,
    ) {}

    start(): void {
        if (this.periodMs <= 0 || this.timer) {
            // Disabled, or already started.
            return;
        }
        this.timer = setInterval(() => {
            this.check().catch((e) => {
                // check() handles its own errors; this only guards against unexpected throws.
                console.error(`[${new Date().toISOString()}] S3 health check unexpected error`, e);
            });
        }, this.periodMs);
        // Do not keep the event loop alive just for the health check.
        this.timer.unref();
    }

    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }

    /**
     * Readiness verdict: whether the shared S3 pool is answering within the failure threshold.
     */
    isHealthy(): boolean {
        return this.consecutiveFailures < this.failureThreshold;
    }

    /**
     * Liveness verdict: whether the shared S3 pool is wedged while S3 itself is still reachable.
     *
     * Short-circuits to `false` while healthy (no extra probe). Once the shared pool is failing, it
     * confirms S3 reachability through a throwaway client with its own fresh pool: success means the
     * shared pool is wedged (restart it); failure means S3 is down (do not restart).
     */
    async isWedged(): Promise<boolean> {
        if (this.isHealthy()) {
            return false;
        }
        return this.probeFreshPool();
    }

    private async probeFreshPool(): Promise<boolean> {
        const probe = this.createProbeClient();
        try {
            await probe.send(new ListObjectsV2Command({ Bucket: this.bucketName, MaxKeys: 1 }));
            // S3 answered through a fresh pool while the shared pool is failing → wedged.
            return true;
        } catch {
            // S3 unreachable through a fresh pool too → real outage, not a wedge.
            return false;
        } finally {
            probe.destroy();
        }
    }

    private async check(): Promise<void> {
        try {
            // A cheap, permission-safe call (the app already lists objects extensively). MaxKeys=1
            // keeps the response tiny; the point is only to exercise the shared connection pool.
            await this.s3.send(new ListObjectsV2Command({ Bucket: this.bucketName, MaxKeys: 1 }));

            const previousFailures = this.consecutiveFailures;
            this.consecutiveFailures = 0;
            if (this.alerting) {
                this.alerting = false;
                console.info(
                    `[${new Date().toISOString()}] S3 connectivity recovered after ${previousFailures} consecutive failed health check(s)`,
                );
            }
        } catch (e) {
            this.consecutiveFailures++;
            if (this.consecutiveFailures >= this.failureThreshold && !this.alerting) {
                this.alerting = true;
                const message =
                    `map-storage cannot reach S3: ${this.consecutiveFailures} consecutive health check(s) failed. ` +
                    `The S3 client connection pool may be exhausted (see INCIDENT_map-storage_s3_agent_exhaustion) ` +
                    `or S3 may be unreachable.`;
                console.error(`[${new Date().toISOString()}] ${message}`, e);
                Sentry.captureException(e instanceof Error ? e : new Error(message), {
                    level: "error",
                    tags: { component: "s3-health-check" },
                    extra: { consecutiveFailures: this.consecutiveFailures, message },
                });
            }
        }
    }
}
