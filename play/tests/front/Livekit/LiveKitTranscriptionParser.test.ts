import { describe, expect, it } from "vitest";
import {
    transcriptionPayloadSchema,
    type LiveKitTranscriptionPayload,
} from "../../../src/front/Livekit/LiveKitTranscriptionParser";
import {
    LIVEKIT_TRANSCRIBED_TRACK_ID_ATTRIBUTE,
    LIVEKIT_TRANSCRIPTION_FINAL_ATTRIBUTE,
    LIVEKIT_TRANSCRIPTION_SEGMENT_ID_ATTRIBUTE,
} from "../../../src/front/Livekit/LiveKitTranscriptionTypes";

const createPayload = (attributes: Record<string, unknown>): LiveKitTranscriptionPayload => {
    return {
        participantIdentity: "speaker-a",
        transcript: "hello world",
        timestamp: 123,
        attributes,
    };
};

describe("LiveKitTranscriptionParser", () => {
    it("parses native lk.transcription event with sender attribution", () => {
        const result = transcriptionPayloadSchema.safeParse(
            createPayload({
                [LIVEKIT_TRANSCRIPTION_SEGMENT_ID_ATTRIBUTE]: "seg-1",
                [LIVEKIT_TRANSCRIBED_TRACK_ID_ATTRIBUTE]: "TR_123",
                [LIVEKIT_TRANSCRIPTION_FINAL_ATTRIBUTE]: "false",
            })
        );

        expect(result.success).toBe(true);
        if (!result.success) {
            return;
        }

        expect(result.data.speakerIdentity).toBe("speaker-a");
        expect(result.data.segmentId).toBe("seg-1");
        expect(result.data.transcribedTrackId).toBe("TR_123");
        expect(result.data.isFinal).toBe(false);
        expect(result.data.text).toBe("hello world");
    });

    it("normalizes lk.transcription_final from string and boolean", () => {
        const fromString = transcriptionPayloadSchema.safeParse(
            createPayload({
                [LIVEKIT_TRANSCRIPTION_SEGMENT_ID_ATTRIBUTE]: "seg-1",
                [LIVEKIT_TRANSCRIBED_TRACK_ID_ATTRIBUTE]: "TR_123",
                [LIVEKIT_TRANSCRIPTION_FINAL_ATTRIBUTE]: "true",
            })
        );
        const fromBoolean = transcriptionPayloadSchema.safeParse(
            createPayload({
                [LIVEKIT_TRANSCRIPTION_SEGMENT_ID_ATTRIBUTE]: "seg-2",
                [LIVEKIT_TRANSCRIBED_TRACK_ID_ATTRIBUTE]: "TR_123",
                [LIVEKIT_TRANSCRIPTION_FINAL_ATTRIBUTE]: false,
            })
        );

        expect(fromString.success).toBe(true);
        expect(fromBoolean.success).toBe(true);
        if (!fromString.success || !fromBoolean.success) {
            return;
        }

        expect(fromString.data.isFinal).toBe(true);
        expect(fromBoolean.data.isFinal).toBe(false);
    });

    it("rejects event missing lk.segment_id", () => {
        const result = transcriptionPayloadSchema.safeParse(
            createPayload({
                [LIVEKIT_TRANSCRIBED_TRACK_ID_ATTRIBUTE]: "TR_123",
                [LIVEKIT_TRANSCRIPTION_FINAL_ATTRIBUTE]: "true",
            })
        );

        expect(result.success).toBe(false);
        if (result.success) {
            return;
        }
        expect(result.error.issues[0]?.path).toEqual(["attributes", LIVEKIT_TRANSCRIPTION_SEGMENT_ID_ATTRIBUTE]);
    });

    it("rejects event missing lk.transcribed_track_id", () => {
        const result = transcriptionPayloadSchema.safeParse(
            createPayload({
                [LIVEKIT_TRANSCRIPTION_SEGMENT_ID_ATTRIBUTE]: "seg-1",
                [LIVEKIT_TRANSCRIPTION_FINAL_ATTRIBUTE]: "true",
            })
        );

        expect(result.success).toBe(false);
        if (result.success) {
            return;
        }
        expect(result.error.issues[0]?.path).toEqual(["attributes", LIVEKIT_TRANSCRIBED_TRACK_ID_ATTRIBUTE]);
    });
});
