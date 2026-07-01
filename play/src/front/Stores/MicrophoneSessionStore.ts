import { AvailabilityStatus } from "@workadventure/messages";
import type { Readable, Unsubscriber } from "svelte/store";
import { derived, writable } from "svelte/store";
import { localUserStore } from "../Connection/LocalUserStore";

export interface RequestedMicrophoneStateStore extends Readable<boolean> {
    enableMicrophone: () => void;
    disableMicrophone: () => void;
}

export interface TemporaryMicrophoneStateStore extends Readable<boolean> {
    enableTemporaryMicrophone: () => void;
    disableTemporaryMicrophone: () => void;
}

export interface MicrophoneSession {
    enablePersistentMicrophone: () => void;
    disablePersistentMicrophone: () => void;
    startTemporaryUnmute: () => void;
    stopTemporaryUnmute: () => void;
    forceMuteMicrophone: () => void;
}

interface CreateMicrophoneSessionStoreOptions {
    initialPersistentMicrophoneState: boolean;
    persistPersistentMicrophoneState: (state: boolean) => void;
}

export function createMicrophoneSessionStore({
    initialPersistentMicrophoneState,
    persistPersistentMicrophoneState,
}: CreateMicrophoneSessionStoreOptions): {
    requestedMicrophoneState: RequestedMicrophoneStateStore;
    temporaryMicrophoneState: TemporaryMicrophoneStateStore;
    effectiveMicrophoneState: Readable<boolean>;
    microphoneSession: MicrophoneSession;
} {
    const requestedMicrophoneWritable = writable(initialPersistentMicrophoneState);
    const temporaryMicrophoneWritable = writable(false);

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

    const temporaryMicrophoneState: TemporaryMicrophoneStateStore = {
        subscribe: temporaryMicrophoneWritable.subscribe,
        enableTemporaryMicrophone: () => temporaryMicrophoneWritable.set(true),
        disableTemporaryMicrophone: () => temporaryMicrophoneWritable.set(false),
    };

    const effectiveMicrophoneState = derived(
        [requestedMicrophoneState, temporaryMicrophoneState],
        ([$requestedMicrophoneState, $temporaryMicrophoneState]) =>
            shouldShowMicrophoneAsEnabled({
                requestedMicrophoneState: $requestedMicrophoneState,
                temporaryMicrophoneState: $temporaryMicrophoneState,
            }),
    );

    const microphoneSession: MicrophoneSession = {
        enablePersistentMicrophone: requestedMicrophoneState.enableMicrophone,
        disablePersistentMicrophone: requestedMicrophoneState.disableMicrophone,
        startTemporaryUnmute: temporaryMicrophoneState.enableTemporaryMicrophone,
        stopTemporaryUnmute: temporaryMicrophoneState.disableTemporaryMicrophone,
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

const defaultMicrophoneSessionStore = createMicrophoneSessionStore({
    initialPersistentMicrophoneState: localUserStore.getRequestedMicrophoneState(),
    persistPersistentMicrophoneState: (state) => localUserStore.setRequestedMicrophoneState(state),
});

export const requestedMicrophoneState = defaultMicrophoneSessionStore.requestedMicrophoneState;
export const temporaryMicrophoneState = defaultMicrophoneSessionStore.temporaryMicrophoneState;
export const effectiveMicrophoneState = defaultMicrophoneSessionStore.effectiveMicrophoneState;
export const microphoneSession = defaultMicrophoneSessionStore.microphoneSession;

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

export function isUnavailableForMicrophone(availabilityStatus: AvailabilityStatus): boolean {
    return (
        availabilityStatus === AvailabilityStatus.DENY_PROXIMITY_MEETING ||
        availabilityStatus === AvailabilityStatus.SILENT ||
        availabilityStatus === AvailabilityStatus.DO_NOT_DISTURB ||
        availabilityStatus === AvailabilityStatus.BACK_IN_A_MOMENT ||
        availabilityStatus === AvailabilityStatus.BUSY
    );
}

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

export function shouldShowMicrophoneAsEnabled({
    requestedMicrophoneState,
    temporaryMicrophoneState,
}: {
    requestedMicrophoneState: boolean;
    temporaryMicrophoneState: boolean;
}): boolean {
    return requestedMicrophoneState || temporaryMicrophoneState;
}

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
