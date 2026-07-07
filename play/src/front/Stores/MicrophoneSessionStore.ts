/**
 * MicrophoneSessionStore — single source of truth for the microphone on/off state.
 *
 * The microphone can be "on" for two independent reasons, which this module keeps separate:
 *  - **persistent / requested** state: the on/off choice the user explicitly latches with the
 *    microphone button. It survives reloads because it is persisted to localStorage.
 *  - **temporary** state: a transient "push-to-talk" unmute that is active only while the user
 *    holds the Space key (see GameSceneUserInputHandler). It is never persisted and is released
 *    as soon as the key is released, the tab loses focus, or push-to-talk stops being available.
 *
 * The **effective** state is simply the OR of the two: the microphone captures/streams audio as
 * soon as either reason is true. Keeping the two apart is what lets us restore the user's real
 * choice once a temporary unmute ends (e.g. releasing Space must NOT permanently turn the mic on).
 *
 * On top of the stores, the file exports a set of small pure helper functions. They were pulled
 * out of MediaStore precisely so the push-to-talk decision logic can be unit-tested in isolation
 * (see MicrophoneSessionStore.test.ts) instead of being buried inside large `derived` stores.
 */
import { AvailabilityStatus } from "@workadventure/messages";
import type { Readable, Unsubscriber } from "svelte/store";
import { derived, writable } from "svelte/store";
import { localUserStore } from "../Connection/LocalUserStore";

/**
 * Persistent microphone state (the user's latched on/off choice).
 * A readable boolean store enriched with mutators that also persist the new value.
 */
export interface RequestedMicrophoneStateStore extends Readable<boolean> {
    enableMicrophone: () => void;
    disableMicrophone: () => void;
}

/**
 * Temporary microphone state (the push-to-talk unmute).
 * A readable boolean store that is toggled on while Space is held and off on release.
 * Unlike the persistent state, it is intentionally not persisted anywhere.
 */
export interface TemporaryMicrophoneStateStore extends Readable<boolean> {
    enableTemporaryMicrophone: () => void;
    disableTemporaryMicrophone: () => void;
}

/**
 * Facade grouping every microphone mutation behind intent-revealing names, so callers do not have
 * to know which underlying store (persistent vs temporary) they are acting on:
 *  - enable/disablePersistentMicrophone: the user's explicit button toggle (persisted).
 *  - start/stopTemporaryUnmute: begin/end a push-to-talk unmute (not persisted).
 *  - forceMuteMicrophone: hard mute used when a moderator/space forces the mic off — clears BOTH
 *    the temporary and the persistent state so the mic cannot come back on by itself.
 */
export interface MicrophoneSession {
    enablePersistentMicrophone: () => void;
    disablePersistentMicrophone: () => void;
    startTemporaryUnmute: () => void;
    stopTemporaryUnmute: () => void;
    forceMuteMicrophone: () => void;
}

interface CreateMicrophoneSessionStoreOptions {
    /** Value the persistent state starts with (usually read back from localStorage). */
    initialPersistentMicrophoneState: boolean;
    /** Callback invoked whenever the persistent state changes, so it can be persisted. */
    persistPersistentMicrophoneState: (state: boolean) => void;
}

/**
 * Builds a self-contained microphone session (the persistent store, the temporary store, the
 * derived effective store and the {@link MicrophoneSession} facade wiring them together).
 *
 * Persistence is injected rather than hard-coded so the store can be created with in-memory stubs
 * in tests. The application uses the default singleton created below with localUserStore.
 */
export function createMicrophoneSessionStore({
    initialPersistentMicrophoneState,
    persistPersistentMicrophoneState,
}: CreateMicrophoneSessionStoreOptions): {
    requestedMicrophoneState: RequestedMicrophoneStateStore;
    temporaryMicrophoneState: TemporaryMicrophoneStateStore;
    effectiveMicrophoneState: Readable<boolean>;
    microphoneSession: MicrophoneSession;
} {
    // Persistent choice starts from the persisted value; the temporary unmute always starts off.
    const requestedMicrophoneWritable = writable(initialPersistentMicrophoneState);
    const temporaryMicrophoneWritable = writable(false);

    // Persistent state: every mutation both updates the store and persists the new value.
    const requestedMicrophoneState: RequestedMicrophoneStateStore = {
        subscribe: requestedMicrophoneWritable.subscribe,
        enableMicrophone: () => {
            requestedMicrophoneWritable.set(true);
            persistPersistentMicrophoneState(true);
        },
        disableMicrophone: () => {
            requestedMicrophoneWritable.set(false);
            persistPersistentMicrophoneState(false);
        },
    };

    // Temporary state: a plain in-memory toggle, deliberately never persisted.
    const temporaryMicrophoneState: TemporaryMicrophoneStateStore = {
        subscribe: temporaryMicrophoneWritable.subscribe,
        enableTemporaryMicrophone: () => temporaryMicrophoneWritable.set(true),
        disableTemporaryMicrophone: () => temporaryMicrophoneWritable.set(false),
    };

    // Effective state = persistent OR temporary. This is what the rest of the app should read to
    // know whether the mic is actually "on" (icon, audio constraint, megaphone streaming, ...).
    const effectiveMicrophoneState = derived(
        [requestedMicrophoneState, temporaryMicrophoneState],
        ([$requestedMicrophoneState, $temporaryMicrophoneState]) =>
            shouldShowMicrophoneAsEnabled({
                requestedMicrophoneState: $requestedMicrophoneState,
                temporaryMicrophoneState: $temporaryMicrophoneState,
            }),
    );

    // Facade exposing the mutations under intent-revealing names (see MicrophoneSession).
    const microphoneSession: MicrophoneSession = {
        enablePersistentMicrophone: requestedMicrophoneState.enableMicrophone,
        disablePersistentMicrophone: requestedMicrophoneState.disableMicrophone,
        startTemporaryUnmute: temporaryMicrophoneState.enableTemporaryMicrophone,
        stopTemporaryUnmute: temporaryMicrophoneState.disableTemporaryMicrophone,
        // Hard mute (moderator / "mute everybody"): clear both states so neither a lingering
        // push-to-talk nor the persisted choice can keep or bring the mic back on.
        forceMuteMicrophone: () => {
            temporaryMicrophoneState.disableTemporaryMicrophone();
            requestedMicrophoneState.disableMicrophone();
        },
    };

    return {
        requestedMicrophoneState,
        temporaryMicrophoneState,
        effectiveMicrophoneState,
        microphoneSession,
    };
}

// Application-wide singleton, backed by localUserStore for persistence across reloads.
// These are the instances the rest of the app imports (directly or re-exported from MediaStore).
const defaultMicrophoneSessionStore = createMicrophoneSessionStore({
    initialPersistentMicrophoneState: localUserStore.getRequestedMicrophoneState(),
    persistPersistentMicrophoneState: (state) => localUserStore.setRequestedMicrophoneState(state),
});

export const requestedMicrophoneState = defaultMicrophoneSessionStore.requestedMicrophoneState;
export const temporaryMicrophoneState = defaultMicrophoneSessionStore.temporaryMicrophoneState;
export const effectiveMicrophoneState = defaultMicrophoneSessionStore.effectiveMicrophoneState;
export const microphoneSession = defaultMicrophoneSessionStore.microphoneSession;

/**
 * Pure rule deciding whether push-to-talk makes sense right now.
 *
 * It is only offered when the mic is currently muted (persistent state off — otherwise the user is
 * already talking and "hold to talk" would be pointless) AND the user is somewhere their voice
 * would be heard: a proximity conversation bubble, a LiveKit room, or as a megaphone speaker.
 */
export function canStartPushToTalk({
    requestedMicrophoneState,
    isInConversationBubble,
    isInLivekit,
    isSpeaker,
}: {
    requestedMicrophoneState: boolean;
    isInConversationBubble: boolean;
    isInLivekit: boolean;
    isSpeaker: boolean;
}): boolean {
    return !requestedMicrophoneState && (isInConversationBubble || isInLivekit || isSpeaker);
}

/**
 * Reactive version of {@link canStartPushToTalk}: derives a boolean store from the relevant source
 * stores. Consumed by the keyboard handler (to know whether Space should start an unmute) and by
 * the release controller (to auto-stop an unmute the moment push-to-talk stops being available).
 */
export function createPushToTalkAvailabilityStore({
    requestedMicrophoneState,
    currentPlayerGroupIdStore,
    inLivekitStore,
    isSpeakerStore,
}: {
    requestedMicrophoneState: Readable<boolean>;
    currentPlayerGroupIdStore: Readable<unknown | undefined>;
    inLivekitStore: Readable<boolean>;
    isSpeakerStore: Readable<boolean>;
}): Readable<boolean> {
    return derived(
        [requestedMicrophoneState, currentPlayerGroupIdStore, inLivekitStore, isSpeakerStore],
        ([$requestedMicrophoneState, $currentPlayerGroupIdStore, $inLivekitStore, $isSpeakerStore]) =>
            canStartPushToTalk({
                requestedMicrophoneState: $requestedMicrophoneState,
                isInConversationBubble: $currentPlayerGroupIdStore !== undefined,
                isInLivekit: $inLivekitStore,
                isSpeaker: $isSpeakerStore,
            }),
    );
}

/**
 * Safety controller that force-ends a push-to-talk unmute on the situations where the keyboard
 * "release Space" event could be missed or is not enough, so the user can never get stuck live:
 *  - push-to-talk stops being available (left the bubble/room, mic turned on manually, ...);
 *  - the window loses focus (blur) — e.g. Alt+Tab while still holding Space;
 *  - the tab becomes hidden (visibilitychange).
 *
 * `windowTarget`/`documentTarget` are injectable so the listeners can be exercised in tests.
 * The returned `destroy()` must be called to unsubscribe and remove the listeners (avoids leaks).
 */
export function createTemporaryUnmuteReleaseController({
    pushToTalkAvailabilityStore,
    stopTemporaryUnmute,
    windowTarget = window,
    documentTarget = document,
}: {
    pushToTalkAvailabilityStore: Readable<boolean>;
    stopTemporaryUnmute: () => void;
    windowTarget?: Window;
    documentTarget?: Document;
}): { destroy: () => void } {
    const releaseTemporaryUnmute = () => {
        stopTemporaryUnmute();
    };

    // visibilitychange fires for both hide and show; only release when actually hidden.
    const releaseOnHiddenDocument = () => {
        if (documentTarget.hidden) {
            releaseTemporaryUnmute();
        }
    };

    const unsubscribeAvailability: Unsubscriber = pushToTalkAvailabilityStore.subscribe((isAvailable) => {
        if (!isAvailable) {
            releaseTemporaryUnmute();
        }
    });

    windowTarget.addEventListener("blur", releaseTemporaryUnmute);
    documentTarget.addEventListener("visibilitychange", releaseOnHiddenDocument);

    return {
        destroy: () => {
            unsubscribeAvailability();
            windowTarget.removeEventListener("blur", releaseTemporaryUnmute);
            documentTarget.removeEventListener("visibilitychange", releaseOnHiddenDocument);
        },
    };
}

/**
 * Availability statuses that forbid the microphone entirely (do-not-disturb, busy, silent zone,
 * etc.). Used both to keep the audio constraint off and to block starting a push-to-talk unmute.
 */
export function isUnavailableForMicrophone(availabilityStatus: AvailabilityStatus): boolean {
    return (
        availabilityStatus === AvailabilityStatus.DENY_PROXIMITY_MEETING ||
        availabilityStatus === AvailabilityStatus.SILENT ||
        availabilityStatus === AvailabilityStatus.DO_NOT_DISTURB ||
        availabilityStatus === AvailabilityStatus.BACK_IN_A_MOMENT ||
        availabilityStatus === AvailabilityStatus.BUSY
    );
}

/**
 * Whether an audio track should actually be requested from getUserMedia (drives the audio media
 * constraint in MediaStore). The mic must be wanted (persistent or temporary) AND allowed by every
 * gate: a real device, not delegated to an external service (Jitsi/BBB), not blocked by privacy
 * (tab in background), not in energy-saving, and not under a mic-forbidding availability status.
 */
export function shouldEnableAudioConstraint({
    requestedMicrophoneState,
    temporaryMicrophoneState,
    myMicrophone,
    isInExternalService,
    shouldDisableMicrophoneForPrivacy,
    isEnergySaving,
    availabilityStatus,
}: {
    requestedMicrophoneState: boolean;
    temporaryMicrophoneState: boolean;
    myMicrophone: boolean;
    isInExternalService: boolean;
    shouldDisableMicrophoneForPrivacy: boolean;
    isEnergySaving: boolean;
    availabilityStatus: AvailabilityStatus;
}): boolean {
    return (
        (requestedMicrophoneState || temporaryMicrophoneState) &&
        myMicrophone &&
        !isInExternalService &&
        !shouldDisableMicrophoneForPrivacy &&
        !isEnergySaving &&
        !isUnavailableForMicrophone(availabilityStatus)
    );
}

/**
 * The rule behind {@link effectiveMicrophoneState}: the mic is "on" if the user latched it on OR a
 * push-to-talk unmute is currently active. Extracted as a pure function to be independently tested.
 */
export function shouldShowMicrophoneAsEnabled({
    requestedMicrophoneState,
    temporaryMicrophoneState,
}: {
    requestedMicrophoneState: boolean;
    temporaryMicrophoneState: boolean;
}): boolean {
    return requestedMicrophoneState || temporaryMicrophoneState;
}

/**
 * Whether the megaphone/live-streaming should keep running: true as long as the speaker is still
 * sharing at least one medium (camera, effective microphone or screen). When all are off, the
 * megaphone can be torn down. Uses the effective mic state so a push-to-talk unmute counts too.
 */
export function shouldKeepMegaphoneStreaming({
    requestedCameraState,
    effectiveMicrophoneState,
    requestedScreenSharingState,
}: {
    requestedCameraState: boolean;
    effectiveMicrophoneState: boolean;
    requestedScreenSharingState: boolean;
}): boolean {
    return requestedCameraState || effectiveMicrophoneState || requestedScreenSharingState;
}

/**
 * Guard so the Space key does not trigger push-to-talk while the user is typing. Returns true when
 * the event target is a text field (input, textarea, select) or any contenteditable element, in
 * which case Space must keep its normal "insert a space" behaviour instead of unmuting the mic.
 */
export function shouldIgnorePushToTalkKeyboardEvent(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable ||
        target.contentEditable === "true" ||
        target.getAttribute("contenteditable") === "true"
    );
}
