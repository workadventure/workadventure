import { getS3Client, hasS3Bucket } from "./Services/S3Client";
import {
    AWS_BUCKET,
    GOOGLE_DRIVE_ROOT_FOLDER_ID,
    GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY,
    STORAGE_DIRECTORY,
} from "./Enum/EnvironmentVariable";
import { S3FileSystem } from "./Upload/S3FileSystem";
import { DiskFileSystem } from "./Upload/DiskFileSystem";
import { GoogleDriveFileSystem } from "./Service/GoogleDriveStorage/GoogleDriveFileSystem";

let fileSystemToExport;

if (GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY && GOOGLE_DRIVE_ROOT_FOLDER_ID) {
    fileSystemToExport = new GoogleDriveFileSystem(GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY, GOOGLE_DRIVE_ROOT_FOLDER_ID);
} else if (hasS3Bucket() && AWS_BUCKET) {
    fileSystemToExport = new S3FileSystem(getS3Client(), AWS_BUCKET);
} else {
    fileSystemToExport = new DiskFileSystem(STORAGE_DIRECTORY);
}

export const fileSystem = fileSystemToExport;
