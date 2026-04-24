import { writable } from "svelte/store";
import RecordingCompletedModal from "../Components/PopUp/Recording/RecordingCompletedToast.svelte";
import RecordingStartedToast from "../Components/PopUp/Recording/RecordingStartedToast.svelte";
import { toastStore } from "./ToastStore";

export type RecordingRequestState = "starting" | "stopping";
export type RecordingStatus = "idle" | "starting" | "recording" | "stopping";

export interface RecordingSpaceState {
    status: Exclude<RecordingStatus, "idle">;
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

function getFirstOtherConfirmedRecording(
    recordingsBySpace: Record<string, RecordingSpaceState>
): RecordingSpaceState | undefined {
    const otherRecordings = Object.values(recordingsBySpace).filter(
        (recording) => !recording.isCurrentUserRecorder && recording.status === "recording"
    );
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
        setRecordingState(
            spaceName: string,
            status: RecordingStatus,
            isCurrentUserRecorder: boolean,
            recorderSpaceUserId: string | null,
            recorderName: string | null
        ) {
            update((state) => {
                const nextRecordingsBySpace = { ...state.recordingsBySpace };
                const nextRequestStatesBySpace = { ...state.requestStatesBySpace };

                delete nextRequestStatesBySpace[spaceName];

                if (status === "idle") {
                    delete nextRecordingsBySpace[spaceName];
                } else {
                    nextRecordingsBySpace[spaceName] = {
                        status,
                        isCurrentUserRecorder,
                        recorderName,
                        recorderSpaceUserId,
                    };
                }

                return buildState(nextRecordingsBySpace, nextRequestStatesBySpace);
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
        removeSpace(spaceName: string) {
            let didRemoveState = false;

            update((state) => {
                if (!(spaceName in state.recordingsBySpace) && !(spaceName in state.requestStatesBySpace)) {
                    return state;
                }

                const nextRecordingsBySpace = { ...state.recordingsBySpace };
                const nextRequestStatesBySpace = { ...state.requestStatesBySpace };

                delete nextRecordingsBySpace[spaceName];
                delete nextRequestStatesBySpace[spaceName];
                didRemoveState = true;

                return buildState(nextRecordingsBySpace, nextRequestStatesBySpace);
            });

            if (!didRemoveState) {
                return;
            }

            this.syncInfoPopup();
        },
        syncInfoPopup() {
            let nextOtherRecording: RecordingSpaceState | undefined;

            update((state) => {
                nextOtherRecording = getFirstOtherConfirmedRecording(state.recordingsBySpace);
                return state;
            });

            if (nextOtherRecording) {
                this.showInfoPopup(nextOtherRecording.recorderName);
                return;
            }

            this.hideInfoPopup();
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
