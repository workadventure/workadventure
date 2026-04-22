import * as Sentry from "@sentry/svelte";
import { get } from "svelte/store";
import { analyticsClient } from "../../../Administration/AnalyticsClient";
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

export function startMegaphoneLive(): void {
    analyticsClient.startMegaphone();
    const megaphoneSpace = get(megaphoneSpaceStore);
    currentLiveStreamingSpaceStore.set(megaphoneSpace);
    requestedMegaphoneStore.set(true);
    startStreamingOnSpace(get(currentLiveStreamingSpaceStore));
}

export function stopMegaphoneLive(): void {
    analyticsClient.stopMegaphone();
    stopStreamingOnSpace(get(currentLiveStreamingSpaceStore));
    requestedMegaphoneStore.set(false);
    currentLiveStreamingSpaceStore.set(undefined);
    streamingMegaphoneStore.set(false);
}
