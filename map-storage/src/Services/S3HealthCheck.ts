import type { S3 } from "@aws-sdk/client-s3";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import * as Sentry from "@sentry/node";

/**
 * Periodically checks that the map-storage process can still reach S3, using the *shared* S3
 * client (and therefore the shared HTTP connection pool).
 *
 * This is designed to detect the "S3 HTTP agent connection pool exhausted" failure mode
 * (see INCIDENT_map-storage_s3_agent_exhaustion): when the pool is wedged, every S3 call —
 * including this probe — times out at the connection timeout. A run of consecutive failures is
 * then a reliable, alertable signal for a condition that otherwise stays invisible until users
 * start hitting HTTP 500s. A single alert is emitted per outage (not once per failed check),
 * and a recovery message is logged when connectivity comes back.
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
     * Whether the last checks are within the acceptable failure threshold. Can be used by a
     * readiness/health endpoint.
     */
    isHealthy(): boolean {
        return this.consecutiveFailures < this.failureThreshold;
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
