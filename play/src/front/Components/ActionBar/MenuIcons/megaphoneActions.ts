import * as Sentry from "@sentry/svelte";
import { get } from "svelte/store";
import { analyticsClient } from "../../../Administration/AnalyticsClient";
import type { EndTimedAnalyticsEvent } from "../../../Administration/TimedAnalyticsEvent";
import {
    currentLiveStreamingSpaceStore,
    megaphoneSpaceStore,
    requestedMegaphoneStore,
} from "../../../Stores/MegaphoneStore";
import { streamingMegaphoneStore } from "../../../Stores/MediaStore";
import type { SpaceInterface } from "../../../Space/SpaceInterface";

function startStreamingOnSpace(space: SpaceInterface | undefined): void {
    try {
        space?.startStreaming();
    } catch (error) {
        console.error("An error occurred while starting streaming", error);
        Sentry.captureException(error);
    }
}

function stopStreamingOnSpace(space: SpaceInterface | undefined): void {
    try {
        space?.stopStreaming();
    } catch (error) {
        console.error("An error occurred while stopping streaming", error);
        Sentry.captureException(error);
    }
}

/** Ends the broadcast currently on air. One interval, however often start is pressed. */
let endBroadcast: EndTimedAnalyticsEvent | undefined;

export function startMegaphoneLive(): void {
    // PostHog counts the press, as it always has. The interval must not restart: this
    // function is reachable twice without an intervening stop — the modal and the
    // action bar both lead here — and reopening would lose the time already broadcast.
    analyticsClient.startMegaphone();
    endBroadcast ??= analyticsClient.openTimedEvent(
        "megaphone.ended",
        {},
        // A reconnect ends the interval without ending the broadcast, and nothing fires
        // a second start. This is the case that made the whole reopen mechanism exist.
        { reopenOnReconnect: true },
    );
    const megaphoneSpace = get(megaphoneSpaceStore);
    currentLiveStreamingSpaceStore.set(megaphoneSpace);
    requestedMegaphoneStore.set(true);
    startStreamingOnSpace(get(currentLiveStreamingSpaceStore));
}

export function stopMegaphoneLive(): void {
    analyticsClient.stopMegaphone();
    endBroadcast?.();
    endBroadcast = undefined;
    stopStreamingOnSpace(get(currentLiveStreamingSpaceStore));
    requestedMegaphoneStore.set(false);
    currentLiveStreamingSpaceStore.set(undefined);
    streamingMegaphoneStore.set(false);
}
