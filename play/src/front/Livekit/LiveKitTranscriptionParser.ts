import { z } from "zod";
import {
    LIVEKIT_TRANSCRIBED_TRACK_ID_ATTRIBUTE,
    LIVEKIT_TRANSCRIPTION_FINAL_ATTRIBUTE,
    LIVEKIT_TRANSCRIPTION_SEGMENT_ID_ATTRIBUTE,
    type LiveKitTranscriptionEvent,
} from "./LiveKitTranscriptionTypes";

export type LiveKitTranscriptionPayload = {
    participantIdentity: string;
    transcript: string;
    timestamp: number;
    attributes?: Record<string, unknown>;
};

/**
 * LiveKit attribute schemas document `lk.transcription_final` as boolean.
 * However, text-stream attributes are currently delivered through `reader.info.attributes`
 * as string values at runtime (including for transcription attributes).
 * We therefore accept both boolean and string forms and normalize to boolean.
 */
const transcriptionFinalSchema = z.union([z.boolean(), z.string()]).transform((value, ctx): boolean => {
    if (typeof value === "boolean") {
        return value;
    }

    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
        return true;
    }
    if (normalized === "false") {
        return false;
    }

    ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "invalid_transcription_final",
    });
    return z.NEVER;
});

export const transcriptionAttributesSchema = z
    .object({
        [LIVEKIT_TRANSCRIPTION_SEGMENT_ID_ATTRIBUTE]: z.string().trim().min(1),
        [LIVEKIT_TRANSCRIBED_TRACK_ID_ATTRIBUTE]: z.string().trim().min(1),
        [LIVEKIT_TRANSCRIPTION_FINAL_ATTRIBUTE]: transcriptionFinalSchema,
    })
    .passthrough();

export const transcriptionPayloadSchema = z
    .object({
        participantIdentity: z.string().min(1),
        transcript: z.string(),
        timestamp: z.number(),
        attributes: transcriptionAttributesSchema,
    })
    .transform((payload): LiveKitTranscriptionEvent => {
        const attributes = payload.attributes;
        return {
            speakerIdentity: payload.participantIdentity,
            segmentId: attributes[LIVEKIT_TRANSCRIPTION_SEGMENT_ID_ATTRIBUTE],
            transcribedTrackId: attributes[LIVEKIT_TRANSCRIBED_TRACK_ID_ATTRIBUTE],
            text: payload.transcript,
            isFinal: attributes[LIVEKIT_TRANSCRIPTION_FINAL_ATTRIBUTE],
            timestamp: payload.timestamp,
            attributes,
        };
    });
