import { S3, S3ClientConfig } from "@aws-sdk/client-s3";
import pLimit from "p-limit";
import {
    AWS_ACCESS_KEY_ID,
    AWS_BUCKET,
    AWS_DEFAULT_REGION,
    AWS_SECRET_ACCESS_KEY,
    AWS_URL,
    S3_UPLOAD_CONCURRENCY_LIMIT,
} from "../Enum/EnvironmentVariable";
import { createS3ClientWithMD5 } from "../Upload/S3ClientWithMD5";

let s3: S3 | undefined;

export function getS3Client(): S3 {
    if (s3) {
        return s3;
    }

    const config: S3ClientConfig = {
        // ID and Secret are detected by default by the lib in the AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY env vars
        region: AWS_DEFAULT_REGION,
    };

    if (AWS_URL) {
        config.endpoint = AWS_URL;
        config.forcePathStyle = true;
        return (s3 = createS3ClientWithMD5(config));
    } else {
        return (s3 = new S3(config));
    }
}

export function hasS3Bucket(): boolean {
    return Boolean(AWS_ACCESS_KEY_ID) && Boolean(AWS_SECRET_ACCESS_KEY) && Boolean(AWS_BUCKET);
}

export const s3UploadConcurrencyLimit = pLimit(S3_UPLOAD_CONCURRENCY_LIMIT);
