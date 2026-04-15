import { writable } from "svelte/store";
import RecordingCompletedModal from "../Components/PopUp/Recording/RecordingCompletedToast.svelte";
import RecordingStartedToast from "../Components/PopUp/Recording/RecordingStartedToast.svelte";
import { toastStore } from "./ToastStore";

export type RecordingRequestState = "starting" | "stopping";

export interface RecordingSpaceState {
    isCurrentUserRecorder: boolean;
    recorderName: string | null;
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

function getFirstOtherRecording(
    recordingsBySpace: Record<string, RecordingSpaceState>
): RecordingSpaceState | undefined {
    const otherRecordings = Object.values(recordingsBySpace).filter((recording) => !recording.isCurrentUserRecorder);
    return otherRecordings.find((recording) => recording.recorderName !== null) ?? otherRecordings[0];
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
            recorderName: string | null
        ) {
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
        },
        setRecorderName(spaceName: string, recorderSpaceUserId: string | null, recorderName: string) {
            update((state) => {
                const currentSpaceRecording = state.recordingsBySpace[spaceName];

                if (
                    !currentSpaceRecording ||
                    currentSpaceRecording.isCurrentUserRecorder ||
                    currentSpaceRecording.recorderSpaceUserId !== recorderSpaceUserId ||
                    currentSpaceRecording.recorderName === recorderName
                ) {
                    return state;
                }

                return buildState(
                    {
                        ...state.recordingsBySpace,
                        [spaceName]: {
                            ...currentSpaceRecording,
                            recorderName,
                        },
                    },
                    state.requestStatesBySpace
                );
            });
        },
        stopRecord(spaceName: string) {
            let didRemoveRecording = false;
            let wasCurrentUserRecorder = false;
            let nextOtherRecording: RecordingSpaceState | undefined;

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
                nextOtherRecording = getFirstOtherRecording(nextRecordingsBySpace);

                return buildState(nextRecordingsBySpace, nextRequestStatesBySpace);
            });

            if (nextOtherRecording) {
                this.showInfoPopup(nextOtherRecording.recorderName);
            } else {
                this.hideInfoPopup();
            }

            if (didRemoveRecording && wasCurrentUserRecorder) {
                this.showCompletedPopup();
            }
        },
        removeSpace(spaceName: string) {
            let didRemoveState = false;
            let nextOtherRecording: RecordingSpaceState | undefined;

            update((state) => {
                if (!(spaceName in state.recordingsBySpace) && !(spaceName in state.requestStatesBySpace)) {
                    return state;
                }

                const nextRecordingsBySpace = { ...state.recordingsBySpace };
                const nextRequestStatesBySpace = { ...state.requestStatesBySpace };

                delete nextRecordingsBySpace[spaceName];
                delete nextRequestStatesBySpace[spaceName];
                didRemoveState = true;
                nextOtherRecording = getFirstOtherRecording(nextRecordingsBySpace);

                return buildState(nextRecordingsBySpace, nextRequestStatesBySpace);
            });

            if (!didRemoveState) {
                return;
            }

            if (nextOtherRecording) {
                this.showInfoPopup(nextOtherRecording.recorderName);
            } else {
                this.hideInfoPopup();
            }
        },
        showInfoPopup(recorderName: string | null) {
            toastStore.addToast(RecordingStartedToast, { recorderName }, "recording-started-toast");
        },
        showGenericInfoPopup() {
            this.showInfoPopup(null);
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
