import type { S3 } from "@aws-sdk/client-s3";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";

/**
 * Live S3 connectivity checks, probed on demand when Kubernetes calls the readiness/liveness
 * endpoints. There is deliberately no background timer, no consecutive-failure counter and no cached
 * verdict: Kubernetes already polls on its own `periodSeconds` and decides when to act via its own
 * `failureThreshold`, so duplicating that in-process only adds state to get wrong.
 *
 * Detects the "S3 HTTP agent connection pool exhausted" failure mode: when the pool is wedged, a
 * probe through the shared client times out, while a probe through a *fresh* pool still succeeds.
 */
export class S3HealthCheck {
    constructor(
        private readonly s3: S3,
        private readonly bucketName: string,
        private readonly createProbeClient: () => S3,
    ) {}

    /**
     * Readiness verdict: can the shared S3 pool answer right now? A cheap ListObjectsV2 (MaxKeys=1)
     * exercises the shared connection pool.
     */
    async isReachable(): Promise<boolean> {
        return this.probe(this.s3);
    }

    /**
     * Liveness verdict: is the shared pool *wedged*? True only when the shared pool fails to answer
     * but a throwaway client with its own fresh pool can reach S3 — meaning S3 is up and a restart
     * will clear the wedge. During a real S3 outage the fresh probe fails too, so this returns false
     * and the pod is not restarted into a crash loop.
     */
    async isWedged(): Promise<boolean> {
        if (await this.probe(this.s3)) {
            return false;
        }
        const probeClient = this.createProbeClient();
        try {
            return await this.probe(probeClient);
        } finally {
            probeClient.destroy();
        }
    }

    private async probe(client: S3): Promise<boolean> {
        try {
            await client.send(new ListObjectsV2Command({ Bucket: this.bucketName, MaxKeys: 1 }));
            return true;
        } catch {
            return false;
        }
    }
}
