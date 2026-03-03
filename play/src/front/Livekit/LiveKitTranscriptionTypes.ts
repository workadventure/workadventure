import type { MapStore } from "@workadventure/store-utils";
import type { z } from "zod";
import type { transcriptionAttributesSchema } from "./LiveKitTranscriptionParser";

export const LIVEKIT_TRANSCRIPTION_TOPIC = "lk.transcription";
export const LIVEKIT_TRANSCRIPTION_FINAL_ATTRIBUTE = "lk.transcription_final";
export const LIVEKIT_TRANSCRIPTION_SEGMENT_ID_ATTRIBUTE = "lk.segment_id";
export const LIVEKIT_TRANSCRIBED_TRACK_ID_ATTRIBUTE = "lk.transcribed_track_id";

export type LiveKitTranscriptionAttributes = z.infer<typeof transcriptionAttributesSchema>;

export type LiveKitTranscriptionEvent = {
    speakerIdentity: string;
    segmentId: string;
    transcribedTrackId: string;
    text: string;
    isFinal: boolean;
    timestamp: number;
    attributes: LiveKitTranscriptionAttributes;
};

export type LiveKitTranscriptionSegmentState = {
    speakerIdentity: string;
    segmentId: string;
    transcribedTrackId: string;
    text: string;
    isFinal: boolean;
    updatedAt: number;
};

export type LiveKitTranscriptionState = MapStore<string, LiveKitTranscriptionSegmentState>;
