import z from "zod";
import * as Sentry from "@sentry/node";
import { MetadataProcessor } from "./MetadataProcessor";

export const metadataProcessor = new MetadataProcessor();

const recordingMetadataSchema = z.object({
    recorder: z.string(),
    recording: z.boolean(),
});

const transcriptionMetadataSchema = z.object({
    transcriber: z.string(),
    transcription: z.boolean(),
});

metadataProcessor.registerMetadataProcessor("recording", async (value, senderId, space) => {
    const recordingMetadata = recordingMetadataSchema.safeParse(value);

    if (!recordingMetadata.success) {
        console.error("Invalid recording metadata", recordingMetadata.error);
        return {
            recorder: null,
            recording: false,
        };
    }

    const spaceUser = space.getUser(senderId);
    if (!spaceUser) {
        console.error("Space user not found", senderId);
        return {
            recorder: null,
            recording: false,
        };
    }

    if (recordingMetadata.data.recording) {
        try {
            await space.startRecording(spaceUser);
            return {
                recorder: recordingMetadata.data.recorder,
                recording: true,
            };
        } catch (error) {
            console.error("Error starting recording", error);
            Sentry.captureException(error);
            return {
                recorder: null,
                recording: false,
            };
        }
    } else {
        try {
            await space.stopRecording(spaceUser);
            return {
                recorder: null,
                recording: false,
            };
        } catch (error) {
            console.error("Error stopping recording", error);
            Sentry.captureException(error);
            throw error;
        }
    }
});

metadataProcessor.registerMetadataProcessor("transcription", async (value, senderId, space) => {
    const transcriptionMetadata = transcriptionMetadataSchema.safeParse(value);

    if (!transcriptionMetadata.success) {
        console.error("Invalid transcription metadata", transcriptionMetadata.error);
        return {
            transcriber: null,
            transcription: false,
        };
    }

    const spaceUser = space.getUser(senderId);
    if (!spaceUser) {
        console.error("Space user not found", senderId);
        return {
            transcriber: null,
            transcription: false,
        };
    }

    if (transcriptionMetadata.data.transcription) {
        try {
            await space.startTranscription(spaceUser);
            return {
                transcriber: transcriptionMetadata.data.transcriber,
                transcription: true,
            };
        } catch (error) {
            console.error("Error starting transcription", error);
            Sentry.captureException(error);
            return {
                transcriber: null,
                transcription: false,
            };
        }
    } else {
        try {
            await space.stopTranscription(spaceUser);
            return {
                transcriber: null,
                transcription: false,
            };
        } catch (error) {
            console.error("Error stopping transcription", error);
            Sentry.captureException(error);
            throw error;
        }
    }
});
