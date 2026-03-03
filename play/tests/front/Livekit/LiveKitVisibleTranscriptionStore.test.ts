import { describe, expect, it } from "vitest";
import { MapStore } from "@workadventure/store-utils";
import { get, writable } from "svelte/store";
import type { LiveKitTranscriptionSegmentState } from "../../../src/front/Livekit/LiveKitTranscriptionTypes";
import {
    createVisibleTranscriptionSegmentsStore,
    selectVisibleTranscriptionSegments,
} from "../../../src/front/Livekit/LiveKitVisibleTranscriptionStore";

function segment(overrides: Partial<LiveKitTranscriptionSegmentState>): LiveKitTranscriptionSegmentState {
    return {
        speakerIdentity: "speaker-1",
        speakerName: "Speaker 1",
        segmentId: "segment-1",
        transcribedTrackId: "TR_1",
        text: "hello",
        isFinal: false,
        updatedAt: 0,
        ...overrides,
    };
}

describe("LiveKitVisibleTranscriptionStore", () => {
    it("keeps non-final segments and removes finalized segments older than TTL", () => {
        const now = 10000;
        const visible = selectVisibleTranscriptionSegments(
            [
                segment({ segmentId: "non-final-old", isFinal: false, updatedAt: 1000 }),
                segment({ segmentId: "final-recent", isFinal: true, updatedAt: 5000 }),
                segment({ segmentId: "final-expired", isFinal: true, updatedAt: 3000 }),
            ],
            now,
            {
                finalSegmentTtlMs: 6000,
                maxSegments: 3,
            }
        );

        expect(visible.map((item) => item.segmentId)).toEqual(["non-final-old", "final-recent"]);
    });

    it("keeps only the latest 3 segments when there are more than 3", () => {
        const visible = selectVisibleTranscriptionSegments(
            [
                segment({ segmentId: "s1", isFinal: false, updatedAt: 1 }),
                segment({ segmentId: "s2", isFinal: false, updatedAt: 2 }),
                segment({ segmentId: "s3", isFinal: false, updatedAt: 3 }),
                segment({ segmentId: "s4", isFinal: false, updatedAt: 4 }),
                segment({ segmentId: "s5", isFinal: false, updatedAt: 5 }),
            ],
            10,
            {
                finalSegmentTtlMs: 6000,
                maxSegments: 3,
            }
        );

        expect(visible.map((item) => item.segmentId)).toEqual(["s3", "s4", "s5"]);
    });

    it("applies deterministic ordering when updatedAt is equal", () => {
        const visible = selectVisibleTranscriptionSegments(
            [
                segment({ segmentId: "segment-b", isFinal: false, updatedAt: 1 }),
                segment({ segmentId: "segment-a", isFinal: false, updatedAt: 1 }),
            ],
            10,
            {
                finalSegmentTtlMs: 6000,
                maxSegments: 3,
            }
        );

        expect(visible.map((item) => item.segmentId)).toEqual(["segment-a", "segment-b"]);
    });

    it("updates visibility reactively when time passes", () => {
        const transcriptionState = new MapStore<string, LiveKitTranscriptionSegmentState>();
        transcriptionState.set(
            "segment-final",
            segment({
                segmentId: "segment-final",
                isFinal: true,
                updatedAt: 1000,
            })
        );

        const nowStore = writable(6000);
        const visibleSegmentsStore = createVisibleTranscriptionSegmentsStore(transcriptionState, {
            finalSegmentTtlMs: 6000,
            maxSegments: 3,
            nowStore,
        });

        expect(get(visibleSegmentsStore).map((item) => item.segmentId)).toEqual(["segment-final"]);

        nowStore.set(7001);

        expect(get(visibleSegmentsStore)).toHaveLength(0);
    });
});
