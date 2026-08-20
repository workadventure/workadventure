import type { Readable } from "svelte/store";
import { derived, writable } from "svelte/store";
import type { SpaceInterface } from "../Space/SpaceInterface";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { isSpeakerStore, requestedCameraState, requestedMicrophoneState } from "./MediaStore";
import { requestedScreenSharingState } from "./ScreenSharingStore";

export const currentLiveStreamingSpaceStore = writable<SpaceInterface | undefined>();
export const megaphoneCanBeUsedStore = writable<boolean>(false);

export const requestedMegaphoneStore = writable<boolean>(false);

export interface MegaphoneSpaceSettings {
    spaceName: string;
    audienceVideoFeedbackActivated: boolean;
    canRecord: boolean;
}

// A store that contains everything needed to connect to the megaphone space.
export const megaphoneSpaceSettingsStore = writable<MegaphoneSpaceSettings | undefined>(undefined);
export const megaphoneSpaceStore = writable<SpaceInterface | undefined>(undefined);

/**
 * This store is true if the user is livestreaming, i.e. if the user is a speaker or (if the user has requested the megaphone and is enabling its camera or microphone or screen)
 */
export const liveStreamingEnabledStore: Readable<boolean> = derived(
    [
        isSpeakerStore,
        requestedMegaphoneStore,
        requestedCameraState,
        requestedMicrophoneState,
        requestedScreenSharingState,
    ],
    (
        [
            $isSpeakerStore,
            $requestedMegaphoneStore,
            $requestedCameraState,
            $requestedMicrophoneState,
            $requestedScreenSharingState,
        ],
        set,
    ) => {
        set(
            $isSpeakerStore ||
                ($requestedMegaphoneStore &&
                    ($requestedCameraState || $requestedMicrophoneState || $requestedScreenSharingState)),
        );
        if (
            $requestedMegaphoneStore &&
            !$requestedCameraState &&
            !$requestedMicrophoneState &&
            !$requestedScreenSharingState
        ) {
            requestedMegaphoneStore.set(false);
        }
    },
);

/**
 * Whether a megaphone broadcast is live, reported to analytics as an interval.
 *
 * Derived from the state rather than reported from startMegaphoneLive/stopMegaphoneLive,
 * because a broadcast ends through more paths than it starts through. Both kick
 * handlers — `kickOffMessage` in RoomConnection and `kickOffUser` in BindMuteEvents —
 * clear the streaming space without touching requestedMegaphoneStore, and the reset a
 * few lines above would end one too the day anything subscribes to
 * liveStreamingEnabledStore (nothing does, today). Reading the state catches all of
 * them; wiring the two buttons would have caught neither.
 *
 * The space is part of the condition for the same reason: it is what every one of
 * those paths actually clears.
 */
const megaphoneBroadcastLiveStore: Readable<boolean> = derived(
    [requestedMegaphoneStore, currentLiveStreamingSpaceStore],
    ([$requestedMegaphoneStore, $currentLiveStreamingSpaceStore]) =>
        $requestedMegaphoneStore && $currentLiveStreamingSpaceStore !== undefined,
);

// This is a singleton so we can safely not ever unsubscribe from it.
// eslint-disable-next-line svelte/no-ignored-unsubscribe
megaphoneBroadcastLiveStore.subscribe((live) => {
    analyticsClient.megaphoneBroadcastChanged(live);
});
