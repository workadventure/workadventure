import { getS3Client, hasS3Bucket } from "./Services/S3Client.ts";
import { AWS_BUCKET, STORAGE_DIRECTORY } from "./Enum/EnvironmentVariable.ts";
import { S3FileSystem } from "./Upload/S3FileSystem.ts";
import { DiskFileSystem } from "./Upload/DiskFileSystem.ts";

export const fileSystem =
    hasS3Bucket() && AWS_BUCKET ? new S3FileSystem(getS3Client(), AWS_BUCKET) : new DiskFileSystem(STORAGE_DIRECTORY);
