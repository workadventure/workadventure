import {
    ListObjectsCommand,
    type ListObjectsCommandOutput,
    S3Client,
    type S3ClientConfig,
    DeleteObjectCommand,
    GetObjectCommand,
    type _Object,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Recording } from "@workadventure/messages";
import {
    LIVEKIT_RECORDING_S3_ENDPOINT,
    LIVEKIT_RECORDING_S3_CDN_ENDPOINT,
    LIVEKIT_RECORDING_S3_BUCKET,
    LIVEKIT_RECORDING_S3_ACCESS_KEY,
    LIVEKIT_RECORDING_S3_SECRET_KEY,
    LIVEKIT_RECORDING_S3_REGION,
} from "../enums/EnvironmentVariable";

export default class RecordingService {
    // Thumbnail signed URLs expire after 1 hour (for viewing in the recordings list)
    private static readonly THUMBNAIL_URL_EXPIRATION_SECONDS = 3600;
    // The egress captures a thumbnail every 10s, so a long recording has hundreds of them. Signing them
    // all would put hundreds of kB of URLs in a single websocket frame, for a preview nobody watches to
    // the end. Spread this many over the video instead.
    private static readonly MAX_THUMBNAILS_PER_RECORDING = 15;
    // The very first thumbnail is often captured before anything is rendered, so the list shows the second one.
    private static readonly POSTER_THUMBNAIL_INDEX = 1;
    private static readonly BASE_FILENAME_REGEX = /^recording-(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})$/;

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

        interface SessionData {
            timestamp: string;
            baseFilename: string;
            videoFile:
                | {
                      key: string;
                      filename: string;
                      size: number | undefined;
                  }
                | undefined;
            thumbnailKeys: { key: string; sequenceNumber: number }[];
        }

        const sessions = new Map<string, SessionData>();

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
                    thumbnailKeys: [],
                });
            }

            const session = sessions.get(timestamp)!;

            if (fileType === "recording") {
                session.videoFile = {
                    key: item.Key,
                    filename: filename,
                    size: item.Size !== undefined ? Number(item.Size) : undefined,
                };
            } else if (fileType === "thumbnail") {
                session.thumbnailKeys.push({ key: item.Key, sequenceNumber: this.getSequenceNumber(filename) });
            }
        });

        // Filter and sort sessions
        const sortedSessions = Array.from(sessions.values())
            .filter((session) => session.videoFile !== undefined)
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        // One signed URL per recording: the rest are fetched on demand, see getThumbnailUrls().
        return Promise.all(
            sortedSessions.map(async (session) => {
                const sortedKeys = this.sortBySequenceNumber(session.thumbnailKeys);
                const poster = sortedKeys[this.POSTER_THUMBNAIL_INDEX] ?? sortedKeys[0];

                return {
                    timestamp: session.timestamp,
                    baseFilename: session.baseFilename,
                    videoFile: session.videoFile,
                    posterUrl: poster ? await this.generateThumbnailSignedUrl(poster.key) : "",
                };
            }),
        );
    }

    /**
     * Signed URLs for the thumbnails of a single recording, evenly spaced over the video and capped to
     * MAX_THUMBNAILS_PER_RECORDING. Used by the hover preview, once the user asks for that recording.
     */
    public static async getThumbnailUrls(userUuid: string, baseFilename: string): Promise<string[]> {
        const timestampMatch = baseFilename.match(this.BASE_FILENAME_REGEX);
        if (!timestampMatch) {
            throw new Error("Invalid recording name");
        }

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

        // The prefix keeps the listing inside the user's own folder, whatever the client asked for.
        const prefix = `${userUuid}/thumbnail-${timestampMatch[1]}_`;
        const contents = await this.listAllObjects(client, LIVEKIT_RECORDING_S3_BUCKET, prefix);

        const sortedKeys = this.sortBySequenceNumber(
            contents.flatMap((item) =>
                item.Key ? [{ key: item.Key, sequenceNumber: this.getSequenceNumber(item.Key) }] : [],
            ),
        );

        // Skip the pre-roll frame, like the poster does.
        const usableKeys = sortedKeys.length > 1 ? sortedKeys.slice(this.POSTER_THUMBNAIL_INDEX) : sortedKeys;

        return Promise.all(
            this.evenlySpaced(usableKeys, this.MAX_THUMBNAILS_PER_RECORDING).map((thumbnail) =>
                this.generateThumbnailSignedUrl(thumbnail.key),
            ),
        );
    }

    /**
     * Picks at most `max` items, evenly spaced over the whole array (first and last always included).
     */
    private static evenlySpaced<T>(items: T[], max: number): T[] {
        if (items.length <= max) {
            return items;
        }

        const step = (items.length - 1) / (max - 1);
        return Array.from({ length: max }, (_, index) => items[Math.round(index * step)]);
    }

    private static getSequenceNumber(filename: string): number {
        const sequenceMatch = filename.match(/_(\d+)\./);
        return sequenceMatch ? parseInt(sequenceMatch[1], 10) : 0;
    }

    /**
     * Thumbnails are numbered _1.jpg.._360.jpg, so they must be ordered numerically, not alphabetically.
     */
    private static sortBySequenceNumber<T extends { sequenceNumber: number }>(thumbnails: T[]): T[] {
        return [...thumbnails].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    }

    /**
     * Generate a signed URL for a thumbnail image (for viewing purposes)
     */
    private static async generateThumbnailSignedUrl(key: string): Promise<string> {
        const client = this.getS3ClientCDN();

        const command = new GetObjectCommand({
            Bucket: LIVEKIT_RECORDING_S3_BUCKET,
            Key: key,
        });

        return getSignedUrl(client, command, { expiresIn: this.THUMBNAIL_URL_EXPIRATION_SECONDS });
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
            LIVEKIT_RECORDING_S3_REGION,
        );
    }

    private static getS3ClientCDN(): S3Client {
        if (
            (!LIVEKIT_RECORDING_S3_CDN_ENDPOINT && !LIVEKIT_RECORDING_S3_ENDPOINT) ||
            !LIVEKIT_RECORDING_S3_BUCKET ||
            !LIVEKIT_RECORDING_S3_ACCESS_KEY ||
            !LIVEKIT_RECORDING_S3_SECRET_KEY ||
            !LIVEKIT_RECORDING_S3_REGION
        ) {
            console.warn("Recording S3 configuration is not set. Skipping fetching recordings.");
            throw new Error("Recording S3 configuration is not set. Skipping fetching recordings.");
        }

        return RecordingService.createS3Client(
            LIVEKIT_RECORDING_S3_CDN_ENDPOINT || LIVEKIT_RECORDING_S3_ENDPOINT!,
            LIVEKIT_RECORDING_S3_ACCESS_KEY,
            LIVEKIT_RECORDING_S3_SECRET_KEY,
            LIVEKIT_RECORDING_S3_REGION,
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

    public static async getSignedUrl(key: string): Promise<string> {
        const client = this.getS3ClientCDN();

        // Extract filename from key for content disposition
        const filename = key.split("/").pop() || key;

        const command = new GetObjectCommand({
            Bucket: LIVEKIT_RECORDING_S3_BUCKET,
            Key: key,
            ResponseContentDisposition: `attachment; filename="${filename}"`,
            ResponseContentType: "application/octet-stream",
        });

        // 2 hours expiration for video playback in cowebsite
        const signedUrl = await getSignedUrl(client, command, { expiresIn: 7200 });

        return signedUrl;
    }
}
