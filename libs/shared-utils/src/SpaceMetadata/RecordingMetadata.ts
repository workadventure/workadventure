import { z } from "zod";

export const RECORDING_METADATA_KEY = "recording";

export const recordingStatusSchema = z.enum(["idle", "starting", "recording", "stopping"]);

// Written by the back only (RecordingManager.publishState); clients are never allowed to set this key.
// `recorder` and `status` stay optional so a payload from an older back still parses.
export const recordingMetadataSchema = z
    .object({
        recording: z.boolean(),
        recorder: z.string().optional().nullable(),
        status: recordingStatusSchema.optional(),
    })
    .transform((value) => ({
        recording: value.recording,
        recorder: value.recorder ?? null,
        status: value.status ?? (value.recording ? ("recording" as const) : ("idle" as const)),
    }));

export type RecordingStatus = z.infer<typeof recordingStatusSchema>;
export type RecordingMetadata = z.infer<typeof recordingMetadataSchema>;
