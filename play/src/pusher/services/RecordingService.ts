import {
    ListObjectsCommand,
    type ListObjectsCommandOutput,
    S3Client,
    S3ClientConfig,
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Recording, VideoFile, Thumbnail } from "@workadventure/messages";
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

        const command = new ListObjectsCommand({
            Bucket: LIVEKIT_RECORDING_S3_BUCKET,
            Prefix: `${userUuid}/`,
        });

        const response: ListObjectsCommandOutput = await client.send(command);
        const contents = response.Contents;

        if (!contents || contents.length === 0) {
            return [];
        }

        const sessions = new Map<string, Recording>();

        contents.forEach((item) => {
            if (!item.Key) return;

            const filename = item.Key.replace(`${userUuid}/`, "");
            const timestampMatch = filename.match(/(recording|thumbnail)-(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);

            if (!timestampMatch) return;

            const fileType = timestampMatch[1]; // "recording" ou "thumbnail"
            const timestamp = timestampMatch[2];

            // Créer la session si elle n'existe pas
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
                const videoFile: VideoFile = {
                    key: item.Key,
                    url: publicUrl,
                    filename: filename,
                    size: item.Size !== undefined ? Number(item.Size) : undefined, // Convertir en number pour uint64
                };
                session.videoFile = videoFile;
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

        try {
            const command = new ListObjectsCommand({
                Bucket: LIVEKIT_RECORDING_S3_BUCKET,
                Prefix: `${userUuid}/`,
            });

            const response: ListObjectsCommandOutput = await client.send(command);
            const contents = response.Contents;

            if (!contents) {
                console.warn("No contents found in bucket");
                return false;
            }

            const timestampBase = recordingId.replace("recording-", "").replace(".mp4", "");
            const filesToDelete = contents
                .filter((item) => {
                    if (!item.Key) return false;

                    const recordingPath = `${userUuid}/${recordingId}`; // Chemin complet de la vidéo
                    const thumbnailPrefix = `${userUuid}/thumbnail-${timestampBase}_`; // Préfixe pour les thumbnails

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

    private static getS3Client(): S3Client {
        if (
            !LIVEKIT_RECORDING_S3_ENDPOINT ||
            !LIVEKIT_RECORDING_S3_BUCKET ||
            !LIVEKIT_RECORDING_S3_ACCESS_KEY ||
            !LIVEKIT_RECORDING_S3_SECRET_KEY
        ) {
            console.warn("Recording S3 configuration is not set. Skipping fetching recordings.");
            throw new Error("Recording S3 configuration is not set. Skipping fetching recordings.");
        }

        const config: S3ClientConfig = {
            endpoint: LIVEKIT_RECORDING_S3_ENDPOINT,
            region: LIVEKIT_RECORDING_S3_REGION,
            credentials: {
                accessKeyId: LIVEKIT_RECORDING_S3_ACCESS_KEY,
                secretAccessKey: LIVEKIT_RECORDING_S3_SECRET_KEY,
            },
            forcePathStyle: true,
        };

        return new S3Client(config);
    }
}
