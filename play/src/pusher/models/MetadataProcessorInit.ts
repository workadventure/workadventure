import z from "zod";
import { MetadataProcessor } from "./MetadataProcessor.ts";
import type { SocketData } from "./Websocket/SocketData.ts";

export const metadataProcessor = new MetadataProcessor();

metadataProcessor.registerMetadataProcessor("recording", (value: unknown, senderSocketData: SocketData) => {
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
        recorder: senderSocketData.userUuid,
        recording: recordingMetadata.data.recording,
    };
});
