import z from "zod";
import { MetadataProcessor } from "./MetadataProcessor";
import type { SocketData } from "./Websocket/SocketData";

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

metadataProcessor.registerMetadataProcessor("transcription", (value: unknown, senderSocketData: SocketData) => {
    const transcriptionMetadata = z
        .object({
            transcription: z.boolean(),
        })
        .safeParse(value);

    if (!transcriptionMetadata.success) {
        throw new Error("Invalid transcription metadata");
    }

    if (!senderSocketData.canTranscribe) {
        throw new Error("You are not allowed to transcribe");
    }

    return {
        transcriber: senderSocketData.userUuid,
        transcription: transcriptionMetadata.data.transcription,
    };
});
