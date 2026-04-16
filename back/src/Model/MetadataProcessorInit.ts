import z from "zod";
import * as Sentry from "@sentry/node";
import { MetadataProcessor } from "./MetadataProcessor";
import type { Space } from "./Space";

export const metadataProcessor = new MetadataProcessor();

const recordingMetadataSchema = z.object({
    recorder: z.string().optional().nullable(),
    recording: z.boolean(),
});

function getRecordingStateSnapshot(space: Space) {
    const recordingState = space.getRecordingState();

    return {
        recorder: recordingState.recorder,
        recording: recordingState.isRecording,
    };
}

metadataProcessor.registerMetadataProcessor("recording", async (value, senderId, space) => {
    const recordingMetadata = recordingMetadataSchema.safeParse(value);

    if (!recordingMetadata.success) {
        console.error("Invalid recording metadata", recordingMetadata.error);
        return getRecordingStateSnapshot(space);
    }

    const spaceUser = space.getUser(senderId);
    if (!spaceUser) {
        console.error("Space user not found", senderId);
        return getRecordingStateSnapshot(space);
    }

    if (recordingMetadata.data.recording) {
        try {
            await space.startRecording(spaceUser);
            return getRecordingStateSnapshot(space);
        } catch (error) {
            console.error("Error starting recording", error);
            Sentry.captureException(error);
            return getRecordingStateSnapshot(space);
        }
    } else {
        try {
            await space.stopRecording(spaceUser);
            return getRecordingStateSnapshot(space);
        } catch (error) {
            console.error("Error stopping recording", error);
            Sentry.captureException(error);
            return getRecordingStateSnapshot(space);
        }
    }
});
