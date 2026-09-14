import { Subject } from "rxjs";
import { writable } from "svelte/store";
import { FilterType } from "@workadventure/messages";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyticsClient } from "../../../src/front/Administration/AnalyticsClient";
import type { SpaceInterface, SpaceUserExtended, UpdateSpaceUserEvent } from "../../../src/front/Space/SpaceInterface";
import { trackBroadcastAnalytics } from "../../../src/front/Streaming/BroadcastAnalytics";

const ME = "me";

function speaker(spaceUserId: string, megaphoneState: boolean): SpaceUserExtended {
    return { spaceUserId, megaphoneState } as SpaceUserExtended;
}

function fakeSpace(filterType: FilterType, metadata = new Map<string, unknown>()) {
    const observeUserJoined = new Subject<SpaceUserExtended>();
    const observeUserLeft = new Subject<SpaceUserExtended>();
    const observeUserUpdated = new Subject<UpdateSpaceUserEvent>();
    const isStreamingAudioStore = writable(false);

    return {
        observeUserJoined,
        observeUserLeft,
        observeUserUpdated,
        isStreamingAudioStore,
        space: {
            filterType,
            mySpaceUserId: ME,
            getName: () => "town-hall",
            getMetadata: () => metadata,
            observeUserJoined,
            observeUserLeft,
            observeUserUpdated,
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
        const { space, observeUserJoined, observeUserUpdated, observeUserLeft } = fakeSpace(
            FilterType.LIVE_STREAMING_USERS,
        );
        const stop = trackBroadcastAnalytics(space);

        observeUserJoined.next(speaker("listener", false));
        expect(opened).toEqual([]);

        observeUserJoined.next(speaker("speaker-1", true));
        expect(opened).toEqual([
            {
                name: "broadcast.audience.ended",
                // A zone unless the space says otherwise: only the world megaphone is
                // handed `isMegaphoneSpace`.
                properties: { broadcastId: "town-hall", broadcastKind: "speaker_zone" },
            },
        ]);

        // A second speaker does not open a second interval: the listener listened once.
        observeUserUpdated.next({ newUser: speaker("speaker-2", true) } as UpdateSpaceUserEvent);
        observeUserLeft.next(speaker("speaker-1", true));
        expect(opened).toHaveLength(1);
        expect(closed).toEqual([]);

        // ... and it closes only when the last one stops.
        observeUserUpdated.next({ newUser: speaker("speaker-2", false) } as UpdateSpaceUserEvent);
        expect(closed).toEqual(["broadcast.audience.ended"]);

        stop();
    });

    it("reports my own airtime as megaphone.ended, never as audience", () => {
        const { space, observeUserJoined, isStreamingAudioStore } = fakeSpace(
            FilterType.LIVE_STREAMING_USERS,
            new Map<string, unknown>([["isMegaphoneSpace", true]]),
        );
        const stop = trackBroadcastAnalytics(space);

        observeUserJoined.next(speaker(ME, true));
        isStreamingAudioStore.set(true);

        expect(opened).toEqual([
            { name: "megaphone.ended", properties: { broadcastId: "town-hall", broadcastKind: "megaphone" } },
        ]);

        stop();
        expect(closed).toEqual(["megaphone.ended"]);
    });

    it("reports nothing for a conversation space", () => {
        const { space, observeUserJoined, isStreamingAudioStore } = fakeSpace(FilterType.ALL_USERS);
        const stop = trackBroadcastAnalytics(space);

        observeUserJoined.next(speaker("someone", true));
        isStreamingAudioStore.set(true);

        expect(opened).toEqual([]);
        stop();
    });
});
