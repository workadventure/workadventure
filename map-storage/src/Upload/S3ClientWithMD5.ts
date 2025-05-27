/**
 * This is a workaround for S3 compatible providers that do not support the new checksum algorithms by AWS yet.
 *
 * See https://github.com/aws/aws-sdk-js-v3/blob/main/supplemental-docs/MD5_FALLBACK.md
 * This is because the AWS SDK for JavaScript v3 uses CRC32 checksums by default, but this doesn't work
 * with other providers like old minio, Oracle S3..., that still requires MD5 checksums.
 */

import { createHash } from "crypto";
import { S3 } from "@aws-sdk/client-s3";
import { HttpRequest } from "@smithy/types";

type Args = {
    request: HttpRequest;
};

/**
 * Creates an S3 client that uses MD5 checksums for DeleteObjects operations
 */
export function createS3ClientWithMD5(configuration = {}) {
    const client = new S3(configuration);

    // Add middleware to remove any SDK-added checksums and add MD5 instead
    // This happens at the 'build' stage, before the request is signed
    client.middlewareStack.add(
        (next, context) => async (args) => {
            const typedArgs = args as Args;

            // Check if this is a DeleteObjects command
            const isDeleteObjects = context.commandName === "DeleteObjectsCommand";
            if (!isDeleteObjects) {
                return next(args);
            }

            const headers = typedArgs.request.headers;

            // Remove any checksum headers
            Object.keys(headers).forEach((header) => {
                if (
                    header.toLowerCase().startsWith("x-amz-checksum-") ||
                    header.toLowerCase().startsWith("x-amz-sdk-checksum-")
                ) {
                    delete headers[header];
                }
            });

            // Add MD5
            if (typedArgs.request.body) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                const bodyContent = Buffer.from(typedArgs.request.body);
                // Create a new hash instance for each request
                headers["Content-MD5"] = createHash("md5").update(bodyContent).digest("base64");
            }

            return await next(args);
        },
        {
            step: "build",
        }
    );
    return client;
}
