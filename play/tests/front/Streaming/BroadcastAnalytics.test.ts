import { writable } from "svelte/store";
import { FilterType } from "@workadventure/messages";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyticsClient } from "../../../src/front/Administration/AnalyticsClient";
import type { SpaceInterface } from "../../../src/front/Space/SpaceInterface";
import { trackBroadcastAnalytics } from "../../../src/front/Streaming/BroadcastAnalytics";

/**
 * Who counts as a speaker is the space's answer, not this module's — `hasRemoteSpeakerStore`
 * already excludes the local user and collapses a panel of three into one boolean, and
 * Space.test.ts is where that is pinned. What is left here is the mapping from the two
 * booleans to the two intervals.
 */
function fakeSpace(filterType: FilterType, metadata = new Map<string, unknown>()) {
    const hasRemoteSpeakerStore = writable(false);
    const isStreamingAudioStore = writable(false);

    return {
        hasRemoteSpeakerStore,
        isStreamingAudioStore,
        space: {
            filterType,
            mySpaceUserId: "me",
            getName: () => "town-hall",
            getMetadata: () => metadata,
            hasRemoteSpeakerStore,
            isStreamingAudioStore,
        } as unknown as SpaceInterface,
    };
}

describe("trackBroadcastAnalytics", () => {
    let opened: { name: string; properties: Record<string, unknown> }[];
    let closed: string[];

    beforeEach(() => {
        opened = [];
        closed = [];
        vi.spyOn(analyticsClient, "openTimedEvent").mockImplementation((name, properties) => {
            opened.push({ name, properties });

            return () => closed.push(name);
        });
    });

    it("measures the audience only while someone else is on air", () => {
        const { space, hasRemoteSpeakerStore } = fakeSpace(FilterType.LIVE_STREAMING_USERS);
        const stop = trackBroadcastAnalytics(space);

        expect(opened).toEqual([]);

        hasRemoteSpeakerStore.set(true);
        expect(opened).toEqual([
            {
                name: "broadcast.audience.ended",
                // A zone unless the space says otherwise: only the world megaphone is
                // handed `isMegaphoneSpace`.
                properties: { broadcastId: "town-hall", broadcastKind: "speaker_zone" },
            },
        ]);
        expect(closed).toEqual([]);

        hasRemoteSpeakerStore.set(false);
        expect(opened).toHaveLength(1);
        expect(closed).toEqual(["broadcast.audience.ended"]);

        stop();
    });

    it("reports my own airtime as megaphone.ended, never as audience", () => {
        const { space, isStreamingAudioStore } = fakeSpace(
            FilterType.LIVE_STREAMING_USERS,
            new Map<string, unknown>([["isMegaphoneSpace", true]]),
        );
        const stop = trackBroadcastAnalytics(space);

        isStreamingAudioStore.set(true);

        expect(opened).toEqual([
            { name: "megaphone.ended", properties: { broadcastId: "town-hall", broadcastKind: "megaphone" } },
        ]);

        stop();
        expect(closed).toEqual(["megaphone.ended"]);
    });

    it("reports nothing for a conversation space", () => {
        const { space, hasRemoteSpeakerStore, isStreamingAudioStore } = fakeSpace(FilterType.ALL_USERS);
        const stop = trackBroadcastAnalytics(space);

        hasRemoteSpeakerStore.set(true);
        isStreamingAudioStore.set(true);

        expect(opened).toEqual([]);
        stop();
    });
});
