import type { Readable } from "svelte/store";
import { derived, readable } from "svelte/store";
import type { LiveKitTranscriptionSegmentState, LiveKitTranscriptionState } from "./LiveKitTranscriptionTypes";

export const DEFAULT_FINAL_SEGMENT_TTL_MS = 6000;
export const DEFAULT_VISIBLE_TRANSCRIPTION_MAX_SEGMENTS = 3;
export const DEFAULT_TRANSCRIPTION_TICK_INTERVAL_MS = 1000;

export type VisibleTranscriptionSegmentsOptions = {
    finalSegmentTtlMs?: number;
    maxSegments?: number;
    tickIntervalMs?: number;
    nowStore?: Readable<number>;
};

function compareSegmentByUpdatedAt(
    left: LiveKitTranscriptionSegmentState,
    right: LiveKitTranscriptionSegmentState
): number {
    if (left.updatedAt !== right.updatedAt) {
        return left.updatedAt - right.updatedAt;
    }

    return left.segmentId.localeCompare(right.segmentId);
}

export function selectVisibleTranscriptionSegments(
    segments: Iterable<LiveKitTranscriptionSegmentState>,
    now: number,
    options?: Pick<VisibleTranscriptionSegmentsOptions, "finalSegmentTtlMs" | "maxSegments">
): LiveKitTranscriptionSegmentState[] {
    const finalSegmentTtlMs = options?.finalSegmentTtlMs ?? DEFAULT_FINAL_SEGMENT_TTL_MS;
    const maxSegments = options?.maxSegments ?? DEFAULT_VISIBLE_TRANSCRIPTION_MAX_SEGMENTS;

    const filteredSegments = Array.from(segments)
        .filter((segment) => {
            if (!segment.isFinal) {
                return true;
            }

            return now - segment.updatedAt <= finalSegmentTtlMs;
        })
        .sort(compareSegmentByUpdatedAt);

    if (filteredSegments.length <= maxSegments) {
        return filteredSegments;
    }

    return filteredSegments.slice(filteredSegments.length - maxSegments);
}

export function createNowStore(tickIntervalMs = DEFAULT_TRANSCRIPTION_TICK_INTERVAL_MS): Readable<number> {
    return readable(Date.now(), (set) => {
        const interval = setInterval(() => {
            set(Date.now());
        }, tickIntervalMs);

        return () => {
            clearInterval(interval);
        };
    });
}

export function createVisibleTranscriptionSegmentsStore(
    transcriptionStateStore: LiveKitTranscriptionState,
    options?: VisibleTranscriptionSegmentsOptions
): Readable<LiveKitTranscriptionSegmentState[]> {
    const finalSegmentTtlMs = options?.finalSegmentTtlMs ?? DEFAULT_FINAL_SEGMENT_TTL_MS;
    const maxSegments = options?.maxSegments ?? DEFAULT_VISIBLE_TRANSCRIPTION_MAX_SEGMENTS;
    const nowStore = options?.nowStore ?? createNowStore(options?.tickIntervalMs);

    return derived([transcriptionStateStore, nowStore], ([$transcriptionStateStore, $nowStore]) => {
        return selectVisibleTranscriptionSegments($transcriptionStateStore.values(), $nowStore, {
            finalSegmentTtlMs,
            maxSegments,
        });
    });
}
