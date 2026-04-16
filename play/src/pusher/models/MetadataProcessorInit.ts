import z from "zod";
import { MetadataProcessor } from "./MetadataProcessor";
import type { SocketData } from "./Websocket/SocketData";

export const metadataProcessor = new MetadataProcessor();

metadataProcessor.registerMetadataProcessor(
    "recording",
    (value: unknown, senderSocketData: SocketData, senderSpaceUserId: string) => {
        const recordingMetadata = z
            .object({
                recording: z.boolean(),
            })
            .safeParse(value);

        if (!recordingMetadata.success) {
            throw new Error("Invalid recording metadata");
        }

        if (!senderSocketData.canRecord) {
            throw new Error("You are not allowed to record");
        }

        return {
            recorder: senderSpaceUserId,
            recording: recordingMetadata.data.recording,
        };
    }
);
