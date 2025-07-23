import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
    ListObjectsCommand,
    type ListObjectsCommandOutput,
    S3Client,
    S3ClientConfig,
    GetObjectCommand
} from "@aws-sdk/client-s3";
import { Recording, VideoFile, Thumbnail } from "@workadventure/messages";
import {
    LIVEKIT_RECORDING_S3_ENDPOINT,
    LIVEKIT_RECORDING_S3_CDN_ENDPOINT,
    LIVEKIT_RECORDING_S3_BUCKET,
    LIVEKIT_RECORDING_S3_ACCESS_KEY,
    LIVEKIT_RECORDING_S3_SECRET_KEY,
    LIVEKIT_RECORDING_S3_REGION
} from "../enums/EnvironmentVariable";

interface Record {
    key: string;
    url: string;
}

// interface RecordingSession {
//     timestamp: string;
//     baseFilename: string;
//     videoFile: {
//         key: string;
//         url: string;
//         filename: string;
//         size?: number;
//     } | null;
//     thumbnails: Array<{
//         key: string;
//         url: string;
//         filename: string;
//         size?: number;
//         sequenceNumber?: number;
//         timestampSeconds?: number;
//     }>;
//     lastModified?: Date;
// }

export default class RecordingService {

    public static async getRecords(userUuid: string): Promise<Recording[]> {
        if (
            !LIVEKIT_RECORDING_S3_ENDPOINT ||
            !LIVEKIT_RECORDING_S3_BUCKET ||
            !LIVEKIT_RECORDING_S3_ACCESS_KEY ||
            !LIVEKIT_RECORDING_S3_SECRET_KEY
        ) {
            console.warn("Recording S3 configuration is not set. Skipping fetching recordings.");
            return [];
        }

        const client = new S3Client({
            endpoint: LIVEKIT_RECORDING_S3_ENDPOINT,
            region: LIVEKIT_RECORDING_S3_REGION,
            credentials: {
                accessKeyId: LIVEKIT_RECORDING_S3_ACCESS_KEY,
                secretAccessKey: LIVEKIT_RECORDING_S3_SECRET_KEY,
            },
            forcePathStyle: true,
        });

        console.log("🍗🍗🍗 Fetching recordings for user:", userUuid, "With endpoint:", LIVEKIT_RECORDING_S3_ENDPOINT);

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

        contents.forEach(item => {
            if (!item.Key) return;

            const filename = item.Key.replace(`${userUuid}/`, '');
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


            if (fileType === 'recording') {
                const videoFile: VideoFile = {
                    key: item.Key,
                    url: publicUrl,
                    filename: filename,
                    size: item.Size !== undefined ? Number(item.Size) : undefined, // Convertir en number pour uint64
                };
                session.videoFile = videoFile;
            } else if (fileType === 'thumbnail') {
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

            // Garder la date de modification la plus récente
            // if (item.LastModified && (!session.lastModified || item.LastModified > session.lastModified)) {
            //     session.lastModified = item.LastModified;
            // }
        });

        // return Array.from(sessions.values())
        //     .map(session => ({
        //         ...session,
        //         thumbnails: session.thumbnails.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0))
        //     }))
        //     .sort((a, b) => {
        //         if (!a.lastModified || !b.lastModified) return 0;
        //         return b.lastModified.getTime() - a.lastModified.getTime();
        //     });
        return Array.from(sessions.values())
            .map(session => ({
                ...session,
                thumbnails: session.thumbnails.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0))
            }))
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        // const records = contents.map((item) => {
        //     if (!item.Key) return null;

        //     // URL directe pour bucket public
        //     const publicUrl = `${LIVEKIT_RECORDING_S3_CDN_ENDPOINT}/${LIVEKIT_RECORDING_S3_BUCKET}/${item.Key}`;

        //     return {
        //         key: item.Key,
        //         url: publicUrl,
        //     };
        // });

        // return records.filter((record): record is Record => record !== null);
    }
}
