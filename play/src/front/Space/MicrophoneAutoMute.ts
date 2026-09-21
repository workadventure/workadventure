import { get, type Unsubscriber } from "svelte/store";
import { FilterType } from "@workadventure/messages";
import { v4 } from "uuid";
import { requestedMicrophoneState } from "../Stores/MediaStore";
import { toastStore } from "../Stores/ToastStoreSingleton";
import MicrophoneAutoMuteToast from "../Components/Toasts/MicrophoneAutoMuteToast.svelte";
import { MAX_SPEAKERS_BEFORE_AUTOMUTE } from "../Enum/EnvironmentVariable";
import type { SpaceInterface, SpaceUserExtended } from "./SpaceInterface";

/**
 * Automatic microphone muting in crowded meetings.
 *
 * When the local user enters a communication space that already has "many" participants with their
 * microphone on, their own microphone is muted automatically (with a warning toast). This caps the
 * number of simultaneously published audio tracks — the main driver of CPU / WebRTC renegotiation
 * load in large LiveKit meetings.
 *
 * Design (see decisions below):
 * - The decision is taken ONCE, at the moment the space is entered. We never mute the user again
 *   afterwards: if they choose to unmute, that is respected even if it takes the meeting over the
 *   limit (this is cooperative, not enforced — and users tend to re-mute after speaking).
 * - "Active microphone" = a remote user actually publishing audio into this space (see
 *   {@link isPublishingMicrophone}): `microphoneState` in a proximity/meeting space, but only on-stage
 *   speakers (`megaphoneState && microphoneState`) in a megaphone/podium space — so joining a map as a
 *   megaphone listener with your mic on does not count.
 * - Applies only to actual communication spaces — those that synchronize media state (proximity
 *   bubbles, meeting rooms and podium/megaphone), i.e. `space.isVideoSpace()`. Presence-only spaces
 *   such as the world space (which syncs only availabilityStatus / chatID) are excluded, so entering a
 *   map alongside other users never triggers the toast.
 * - Restore-on-leave: if we auto-muted on entry and the user never touched the microphone button
 *   while in the meeting, their previous (on) state is restored when they leave.
 *
 * The feature is disabled when `MAX_SPEAKERS_BEFORE_AUTOMUTE <= 0`.
 */

interface AutoMuteRecord {
    /** Set to true as soon as the user manually toggles the microphone after we auto-muted it. */
    manuallyToggled: boolean;
    /** Id of the warning toast, so it can be dismissed when the user leaves the space. */
    toastUuid: string;
    /** Stops watching for a manual toggle. */
    unsubscribe: Unsubscriber;
}

/**
 * Spaces the local user was auto-muted in, keyed by the space instance. Used to restore the previous
 * microphone state on leave (unless the user manually touched the microphone in the meantime).
 */
const autoMutedSpaces = new WeakMap<SpaceInterface, AutoMuteRecord>();

/**
 * Whether the given user is actively publishing their microphone into a space of the given filter type.
 *
 * In a megaphone / podium space (LIVE_STREAMING_*), only on-stage speakers (megaphoneState) broadcast
 * audio; everyone else is a listener whose microphoneState is for proximity chat, not this space. In an
 * ALL_USERS media space (proximity bubble / meeting room), everyone publishes their microphone.
 */
function isPublishingMicrophone(user: Readonly<SpaceUserExtended>, filterType: FilterType): boolean {
    if (
        filterType === FilterType.LIVE_STREAMING_USERS ||
        filterType === FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK
    ) {
        return user.megaphoneState && user.microphoneState;
    }
    return user.microphoneState;
}

/**
 * Counts the number of OTHER users publishing their microphone into the space (see
 * {@link isPublishingMicrophone}). The local user (`mySpaceUserId`) is excluded from the count.
 */
export function countActiveMicrophones(
    users: Map<string, Readonly<SpaceUserExtended>>,
    mySpaceUserId: string,
    filterType: FilterType,
): number {
    let count = 0;
    for (const user of users.values()) {
        if (user.spaceUserId !== mySpaceUserId && isPublishingMicrophone(user, filterType)) {
            count++;
        }
    }
    return count;
}

/**
 * Pure decision helper: should the local user be auto-muted on entering the meeting?
 * @param activeMicrophones number of OTHER users already publishing audio
 * @param myMicrophoneOn whether the local microphone is currently on
 * @param limit MAX_SPEAKERS_BEFORE_AUTOMUTE (<= 0 disables the feature)
 */
export function shouldAutoMute(activeMicrophones: number, myMicrophoneOn: boolean, limit: number): boolean {
    return limit > 0 && myMicrophoneOn && activeMicrophones >= limit;
}

/**
 * Evaluated once, when the local user enters a space (on join, or when going live on a podium). If the
 * space synchronizes microphone state and already has `MAX_SPEAKERS_BEFORE_AUTOMUTE` participants unmuted,
 * the local microphone is muted before it is published.
 *
 * `activeMicrophoneCount` is the number of OTHER users already publishing audio: on join it comes from
 * the back in the join answer (`space.initialActiveMicrophoneCount`), which resolves *before* the media
 * connection publishes — so muting here means the audio track is never published (no publish-then-mute
 * renegotiation). On the podium it is counted locally from the already-loaded roster.
 *
 * Safe to call for every entered space: it returns early for spaces that are not communication spaces
 * (`!space.isVideoSpace()`), when the feature is disabled, or when the space was already handled.
 */
export function evaluateMicrophoneAutoMute(space: SpaceInterface, activeMicrophoneCount: number): void {
    if (MAX_SPEAKERS_BEFORE_AUTOMUTE <= 0) {
        return;
    }
    // Only communication spaces (that sync media state) can trigger auto-mute. This excludes the world
    // / presence space you join on map entry, which only syncs availabilityStatus / chatID.
    if (!space.isVideoSpace()) {
        return;
    }
    // Already handled for this space (e.g. muted on join, then re-evaluated when going live on a
    // podium). Don't re-evaluate or create a duplicate manual-toggle watcher.
    if (autoMutedSpaces.has(space)) {
        return;
    }
    // Nothing to mute if the microphone is already off when entering.
    if (!get(requestedMicrophoneState)) {
        return;
    }
    if (!shouldAutoMute(activeMicrophoneCount, true, MAX_SPEAKERS_BEFORE_AUTOMUTE)) {
        return;
    }

    // Auto-mute and warn the user (the toast pulls its own text and offers a one-click unmute).
    // Use a known id so the toast can be dismissed when the user leaves the space (see restore below).
    const toastUuid = v4();
    requestedMicrophoneState.disableMicrophone();
    toastStore.addToast(MicrophoneAutoMuteToast, {}, toastUuid);

    // Watch for a manual toggle so we know whether to restore the previous state on leave.
    // Svelte fires the subscriber immediately with the current value (false, i.e. our own mute); we
    // skip that first synchronous call. Any later change means the user pressed the microphone button.
    let skipInitial = true;
    const record: AutoMuteRecord = {
        manuallyToggled: false,
        toastUuid,
        unsubscribe: () => {},
    };
    record.unsubscribe = requestedMicrophoneState.subscribe(() => {
        if (skipInitial) {
            skipInitial = false;
            return;
        }
        record.manuallyToggled = true;
        record.unsubscribe();
    });
    autoMutedSpaces.set(space, record);
}

/**
 * Called when the local user leaves a space. If we auto-muted them on entry and they never touched
 * the microphone button while in the meeting, their previous (on) microphone state is restored.
 */
export function restoreMicrophoneAutoMuteOnLeave(space: SpaceInterface): void {
    const record = autoMutedSpaces.get(space);
    if (!record) {
        return;
    }
    autoMutedSpaces.delete(space);
    record.unsubscribe();

    // Dismiss the "muted automatically" warning — it is only relevant while in the meeting.
    toastStore.removeToast(record.toastUuid);

    if (!record.manuallyToggled) {
        // We muted on entry and the user left it untouched: restore the microphone they had on before.
        requestedMicrophoneState.enableMicrophone();
    }
}
