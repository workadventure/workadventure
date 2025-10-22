import {
    ListObjectsCommand,
    type ListObjectsCommandOutput,
    S3Client,
    S3ClientConfig,
    DeleteObjectCommand,
    GetObjectCommand,
    type _Object,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Recording, Thumbnail } from "@workadventure/messages";
import {
    LIVEKIT_RECORDING_S3_ENDPOINT,
    LIVEKIT_RECORDING_S3_CDN_ENDPOINT,
    LIVEKIT_RECORDING_S3_BUCKET,
    LIVEKIT_RECORDING_S3_ACCESS_KEY,
    LIVEKIT_RECORDING_S3_SECRET_KEY,
    LIVEKIT_RECORDING_S3_REGION,
} from "../enums/EnvironmentVariable";

export default class RecordingService {
    public static async getRecords(userUuid: string): Promise<Recording[]> {
        let client: S3Client;
        try {
            client = this.getS3Client();
        } catch (error) {
            console.error("Error getting S3 client:", error);
            return [];
        }

        if (!LIVEKIT_RECORDING_S3_BUCKET) {
            console.error("LIVEKIT_RECORDING_S3_BUCKET is not configured");
            return [];
        }

        const contents = await this.listAllObjects(client, LIVEKIT_RECORDING_S3_BUCKET, `${userUuid}/`);

        if (contents.length === 0) {
            return [];
        }

        const sessions = new Map<string, Recording>();

        contents.forEach((item) => {
            if (!item.Key) return;

            const filename = item.Key.replace(`${userUuid}/`, "");
            const timestampMatch = filename.match(/(recording|thumbnail)-(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);

            if (!timestampMatch) return;

            const fileType = timestampMatch[1]; // "recording" or "thumbnail"
            const timestamp = timestampMatch[2];

            // Create the session if it doesn't exist
            if (!sessions.has(timestamp)) {
                sessions.set(timestamp, {
                    timestamp: timestamp,
                    baseFilename: `recording-${timestamp}`,
                    videoFile: undefined,
                    thumbnails: [],
                });
            }

            const session = sessions.get(timestamp)!;
            const publicUrl = `${LIVEKIT_RECORDING_S3_CDN_ENDPOINT}/${LIVEKIT_RECORDING_S3_BUCKET}/${item.Key}`;

            if (fileType === "recording") {
                session.videoFile = {
                    key: item.Key,
                    url: publicUrl,
                    filename: filename,
                    size: item.Size !== undefined ? Number(item.Size) : undefined, // Convert in uint64
                };
            } else if (fileType === "thumbnail") {
                const sequenceMatch = filename.match(/_(\d+)\./);
                const sequenceNumber = sequenceMatch ? parseInt(sequenceMatch[1], 10) : 0;
                const timestampSeconds = (sequenceNumber - 1) * 120;

                const thumbnail: Thumbnail = {
                    key: item.Key,
                    url: publicUrl,
                    filename: filename,
                    size: item.Size !== undefined ? Number(item.Size) : undefined,
                    sequenceNumber: sequenceNumber,
                    timestampSeconds: timestampSeconds,
                };

                session.thumbnails.push(thumbnail);
            }
        });
        return Array.from(sessions.values())
            .map((session) => ({
                ...session,
                thumbnails: session.thumbnails.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0)),
            }))
            .filter((session) => session.videoFile !== undefined)
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }

    public static async deleteRecord(userUuid: string, recordingId: string): Promise<boolean> {
        let client: S3Client;
        try {
            client = this.getS3Client();
        } catch (error) {
            console.error("Error getting S3 client:", error);
            return false;
        }

        if (!LIVEKIT_RECORDING_S3_BUCKET) {
            console.error("LIVEKIT_RECORDING_S3_BUCKET is not configured");
            return false;
        }

        try {
            const contents = await this.listAllObjects(client, LIVEKIT_RECORDING_S3_BUCKET, `${userUuid}/`);

            if (contents.length === 0) {
                console.warn("No contents found in bucket");
                return false;
            }

            const timestampBase = recordingId.replace("recording-", "").replace(".mp4", "");
            const filesToDelete = contents
                .filter((item) => {
                    if (!item.Key) return false;

                    const recordingPath = `${userUuid}/${recordingId}`; // Full path of the recording
                    const thumbnailPrefix = `${userUuid}/thumbnail-${timestampBase}_`; // Prefix for the thumbnails

                    return item.Key === recordingPath || item.Key.startsWith(thumbnailPrefix);
                })
                .map((item) => item.Key!);

            if (filesToDelete.length === 0) {
                console.warn("No files found to delete for timestamp:", timestampBase);
                return false;
            }

            const deletePromises = filesToDelete.map(async (key) => {
                const deleteCommand = new DeleteObjectCommand({
                    Bucket: LIVEKIT_RECORDING_S3_BUCKET,
                    Key: key,
                });
                return client.send(deleteCommand);
            });

            await Promise.all(deletePromises);

            return true;
        } catch (error) {
            console.error("Error deleting recording:", error);
            return false;
        }
    }

    /**
     * List all objects in a S3 bucket with pagination support
     * @param client S3 client instance
     * @param bucket Bucket name
     * @param prefix Prefix to filter objects
     * @returns Array of all objects
     */
    private static async listAllObjects(client: S3Client, bucket: string, prefix: string): Promise<_Object[]> {
        const allContents: _Object[] = [];
        let isTruncated = true;
        let marker: string | undefined = undefined;

        while (isTruncated) {
            const command = new ListObjectsCommand({
                Bucket: bucket,
                Prefix: prefix,
                Marker: marker,
            });

            // eslint-disable-next-line no-await-in-loop
            const response: ListObjectsCommandOutput = await client.send(command);

            if (response.Contents) {
                allContents.push(...response.Contents);
            }

            isTruncated = response.IsTruncated ?? false;
            marker = response.NextMarker;

            // If IsTruncated is true but NextMarker is not provided,
            // use the last key as the marker for the next request
            if (isTruncated && !marker && response.Contents && response.Contents.length > 0) {
                marker = response.Contents[response.Contents.length - 1].Key;
            }
        }

        return allContents;
    }

    private static getS3Client(): S3Client {
        if (
            !LIVEKIT_RECORDING_S3_ENDPOINT ||
            !LIVEKIT_RECORDING_S3_BUCKET ||
            !LIVEKIT_RECORDING_S3_ACCESS_KEY ||
            !LIVEKIT_RECORDING_S3_SECRET_KEY ||
            !LIVEKIT_RECORDING_S3_REGION
        ) {
            console.warn("Recording S3 configuration is not set. Skipping fetching recordings.");
            throw new Error("Recording S3 configuration is not set. Skipping fetching recordings.");
        }

        return RecordingService.createS3Client(
            LIVEKIT_RECORDING_S3_ENDPOINT,
            LIVEKIT_RECORDING_S3_ACCESS_KEY,
            LIVEKIT_RECORDING_S3_SECRET_KEY,
            LIVEKIT_RECORDING_S3_REGION
        );
    }

    private static getS3ClientCDN(): S3Client {
        if (
            !LIVEKIT_RECORDING_S3_CDN_ENDPOINT ||
            !LIVEKIT_RECORDING_S3_BUCKET ||
            !LIVEKIT_RECORDING_S3_ACCESS_KEY ||
            !LIVEKIT_RECORDING_S3_SECRET_KEY ||
            !LIVEKIT_RECORDING_S3_REGION
        ) {
            console.warn("Recording S3 configuration is not set. Skipping fetching recordings.");
            throw new Error("Recording S3 configuration is not set. Skipping fetching recordings.");
        }

        return RecordingService.createS3Client(
            LIVEKIT_RECORDING_S3_CDN_ENDPOINT,
            LIVEKIT_RECORDING_S3_ACCESS_KEY,
            LIVEKIT_RECORDING_S3_SECRET_KEY,
            LIVEKIT_RECORDING_S3_REGION
        );
    }

    private static createS3Client(endpoint: string, accessKey: string, secretKey: string, region: string): S3Client {
        const config: S3ClientConfig = {
            endpoint: endpoint,
            region: region,
            credentials: {
                accessKeyId: accessKey,
                secretAccessKey: secretKey,
            },
            forcePathStyle: true,
        };
        return new S3Client(config);
    }

    public static async getSignedUrl(key: string, userUuid: string): Promise<string> {
        const client = this.getS3ClientCDN();
        const command = new GetObjectCommand({
            Bucket: LIVEKIT_RECORDING_S3_BUCKET,
            Key: key,
            ResponseContentDisposition: `attachment; filename="${key}"`,
            ResponseContentType: "application/octet-stream",
        });

        const signedUrl = await getSignedUrl(client, command, { expiresIn: 60 });

        return signedUrl;
    }
}
