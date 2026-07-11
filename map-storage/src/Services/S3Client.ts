import type { S3ClientConfig } from "@aws-sdk/client-s3";
import { S3 } from "@aws-sdk/client-s3";
import pLimit from "p-limit";
import {
    AWS_ACCESS_KEY_ID,
    AWS_BUCKET,
    AWS_DEFAULT_REGION,
    AWS_SECRET_ACCESS_KEY,
    AWS_URL,
    S3_CONNECTION_TIMEOUT,
    S3_MAX_PARALLEL_REQUESTS,
    S3_REQUEST_TIMEOUT,
    S3_UPLOAD_CONCURRENCY_LIMIT,
} from "../Enum/EnvironmentVariable";
import { createS3ClientWithMD5 } from "../Upload/S3ClientWithMD5";

let s3: S3 | undefined;

function buildS3Config(maxSockets: number): S3ClientConfig {
    return {
        // ID and Secret are detected by default by the lib in the AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY env vars
        region: AWS_DEFAULT_REGION,
        requestHandler: {
            connectionTimeout: S3_CONNECTION_TIMEOUT,
            requestTimeout: S3_REQUEST_TIMEOUT,
            httpsAgent: { maxSockets },
        },
    };
}

function instantiateS3(config: S3ClientConfig): S3 {
    if (AWS_URL) {
        config.endpoint = AWS_URL;
        config.forcePathStyle = true;
        return createS3ClientWithMD5(config);
    }
    return new S3(config);
}

export function getS3Client(): S3 {
    if (s3) {
        return s3;
    }
    return (s3 = instantiateS3(buildS3Config(S3_MAX_PARALLEL_REQUESTS)));
}

/**
 * Builds a *throwaway* S3 client backed by its own fresh HTTP connection pool (a brand new
 * `https.Agent`), independent of the shared pool returned by {@link getS3Client}.
 *
 * It exists only to tell two look-alike failures apart when the shared pool stops answering
 * (see INCIDENT_map-storage_s3_agent_exhaustion): a *wedged* shared pool (S3 is reachable, but our
 * pool's socket accounting is stuck) versus a *real* S3 outage (S3 is unreachable). A probe through
 * this fresh pool succeeds in the first case and fails in the second. The caller is expected to
 * `.destroy()` it after use so it never lingers.
 */
export function createProbeS3Client(): S3 {
    // A tiny pool: the probe issues a single request at a time.
    return instantiateS3(buildS3Config(2));
}

export function hasS3Bucket(): boolean {
    return Boolean(AWS_ACCESS_KEY_ID) && Boolean(AWS_SECRET_ACCESS_KEY) && Boolean(AWS_BUCKET);
}

export const s3UploadConcurrencyLimit = pLimit(S3_UPLOAD_CONCURRENCY_LIMIT);
