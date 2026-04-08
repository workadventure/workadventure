import { writable } from "svelte/store";
import RecordingCompletedModal from "../Components/PopUp/Recording/RecordingCompletedToast.svelte";
import RecordingStartedToast from "../Components/PopUp/Recording/RecordingStartedToast.svelte";
import { toastStore } from "./ToastStore";

export type RecordingRequestState = "starting" | "stopping";

export interface RecordingSpaceState {
    isCurrentUserRecorder: boolean;
    recorderName: string;
    recorderSpaceUserId: string | null;
}

export interface RecordingState {
    recordingsBySpace: Record<string, RecordingSpaceState>;
    requestStatesBySpace: Record<string, RecordingRequestState>;
    isRecording: boolean;
    isCurrentUserRecorder: boolean;
}

const initialState: RecordingState = {
    recordingsBySpace: {},
    requestStatesBySpace: {},
    isRecording: false,
    isCurrentUserRecorder: false,
};

function buildState(
    recordingsBySpace: Record<string, RecordingSpaceState>,
    requestStatesBySpace: Record<string, RecordingRequestState>
): RecordingState {
    const recordings = Object.values(recordingsBySpace);

    return {
        recordingsBySpace,
        requestStatesBySpace,
        isRecording: recordings.length > 0,
        isCurrentUserRecorder: recordings.some((recording) => recording.isCurrentUserRecorder),
    };
}

function getFirstOtherRecorderName(recordingsBySpace: Record<string, RecordingSpaceState>): string | undefined {
    return Object.values(recordingsBySpace).find((recording) => !recording.isCurrentUserRecorder)?.recorderName;
}

function createRecordingStore() {
    const { subscribe, update, set } = writable<RecordingState>(initialState);

    return {
        subscribe,
        setRequestState(spaceName: string, requestState: RecordingRequestState) {
            update((state) =>
                buildState(state.recordingsBySpace, {
                    ...state.requestStatesBySpace,
                    [spaceName]: requestState,
                })
            );
        },
        clearRequestState(spaceName: string) {
            update((state) => {
                if (!(spaceName in state.requestStatesBySpace)) {
                    return state;
                }

                const nextRequestStatesBySpace = { ...state.requestStatesBySpace };
                delete nextRequestStatesBySpace[spaceName];

                return buildState(state.recordingsBySpace, nextRequestStatesBySpace);
            });
        },
        startRecord(
            spaceName: string,
            isCurrentUser: boolean = false,
            recorderSpaceUserId: string | null,
            recorderName: string
        ) {
            let shouldShowInfoPopup = false;

            update((state) => {
                const currentSpaceRecording = state.recordingsBySpace[spaceName];
                const hasPendingRequest = spaceName in state.requestStatesBySpace;

                if (
                    currentSpaceRecording &&
                    currentSpaceRecording.isCurrentUserRecorder === isCurrentUser &&
                    currentSpaceRecording.recorderName === recorderName &&
                    currentSpaceRecording.recorderSpaceUserId === recorderSpaceUserId &&
                    !hasPendingRequest
                ) {
                    return state;
                }

                const nextRequestStatesBySpace = { ...state.requestStatesBySpace };
                delete nextRequestStatesBySpace[spaceName];

                shouldShowInfoPopup =
                    !isCurrentUser &&
                    (!currentSpaceRecording ||
                        currentSpaceRecording.recorderSpaceUserId !== recorderSpaceUserId ||
                        currentSpaceRecording.recorderName !== recorderName);

                return buildState(
                    {
                        ...state.recordingsBySpace,
                        [spaceName]: {
                            isCurrentUserRecorder: isCurrentUser,
                            recorderName,
                            recorderSpaceUserId,
                        },
                    },
                    nextRequestStatesBySpace
                );
            });

            if (shouldShowInfoPopup) {
                this.showInfoPopup(recorderName);
            }
        },
        stopRecord(spaceName: string) {
            let didRemoveRecording = false;
            let wasCurrentUserRecorder = false;
            let nextOtherRecorderName: string | undefined;

            update((state) => {
                const currentSpaceRecording = state.recordingsBySpace[spaceName];
                const hasPendingRequest = spaceName in state.requestStatesBySpace;

                if (!currentSpaceRecording && !hasPendingRequest) {
                    return state;
                }

                const nextRecordingsBySpace = { ...state.recordingsBySpace };
                const nextRequestStatesBySpace = { ...state.requestStatesBySpace };

                if (currentSpaceRecording) {
                    didRemoveRecording = true;
                    wasCurrentUserRecorder = currentSpaceRecording.isCurrentUserRecorder;
                    delete nextRecordingsBySpace[spaceName];
                }

                delete nextRequestStatesBySpace[spaceName];
                nextOtherRecorderName = getFirstOtherRecorderName(nextRecordingsBySpace);

                return buildState(nextRecordingsBySpace, nextRequestStatesBySpace);
            });

            if (nextOtherRecorderName) {
                this.showInfoPopup(nextOtherRecorderName);
            } else {
                this.hideInfoPopup();
            }

            if (didRemoveRecording && wasCurrentUserRecorder) {
                this.showCompletedPopup();
            }
        },
        removeSpace(spaceName: string) {
            let didRemoveState = false;
            let nextOtherRecorderName: string | undefined;

            update((state) => {
                if (!(spaceName in state.recordingsBySpace) && !(spaceName in state.requestStatesBySpace)) {
                    return state;
                }

                const nextRecordingsBySpace = { ...state.recordingsBySpace };
                const nextRequestStatesBySpace = { ...state.requestStatesBySpace };

                delete nextRecordingsBySpace[spaceName];
                delete nextRequestStatesBySpace[spaceName];
                didRemoveState = true;
                nextOtherRecorderName = getFirstOtherRecorderName(nextRecordingsBySpace);

                return buildState(nextRecordingsBySpace, nextRequestStatesBySpace);
            });

            if (!didRemoveState) {
                return;
            }

            if (nextOtherRecorderName) {
                this.showInfoPopup(nextOtherRecorderName);
            } else {
                this.hideInfoPopup();
            }
        },
        showInfoPopup(recorderName: string) {
            toastStore.addToast(RecordingStartedToast, { recorderName }, "recording-started-toast");
        },
        hideInfoPopup() {
            toastStore.removeToast("recording-started-toast");
        },
        showCompletedPopup() {
            toastStore.addToast(RecordingCompletedModal, {}, "recording-completed-popup");
        },
        hideCompletedPopup() {
            toastStore.removeToast("recording-completed-popup");
        },
        reset() {
            set(initialState);
            this.hideInfoPopup();
            this.hideCompletedPopup();
        },
    };
}

export const recordingStore = createRecordingStore();
export const showRecordingList = writable(false);
