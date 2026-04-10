import z from "zod";
import * as Sentry from "@sentry/node";
import { MetadataProcessor } from "./MetadataProcessor";

export const metadataProcessor = new MetadataProcessor();

const recordingMetadataSchema = z.object({
    recorder: z.string(),
    recording: z.boolean(),
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
