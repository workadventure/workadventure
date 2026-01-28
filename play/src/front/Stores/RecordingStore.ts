import { writable } from "svelte/store";

interface RecordingState {
    isRecording: boolean;
    shouldShowInfoPopup: boolean;
    shouldShowCompletedPopup: boolean;
    isCurrentUserRecorder: boolean;
}

const initialState: RecordingState = {
    isRecording: false,
    shouldShowInfoPopup: false,
    shouldShowCompletedPopup: false,
    isCurrentUserRecorder: false,
};

function createRecordingStore() {
    const { subscribe, update, set } = writable<RecordingState>(initialState);

    return {
        subscribe,
        shouldShowInfoPopup: initialState.shouldShowInfoPopup,
        shouldShowCompletedPopup: initialState.shouldShowCompletedPopup,
        isRecording: initialState.isRecording,
        isCurrentUserRecorder: initialState.isCurrentUserRecorder,
        startRecord(isCurrentUser: boolean = false) {
            update((state) => ({
                ...state,
                isRecording: true,
                isCurrentUserRecorder: isCurrentUser,
            }));

            if (!isCurrentUser) this.showInfoPopup();
        },
        stopRecord(wasRecorder: boolean = false) {
            const wasCurrentUserRecorder = wasRecorder;
            update((state) => ({
                ...state,
                isRecording: false,
                isCurrentUserRecorder: false,
            }));
            this.hideInfoPopup();
            if (wasCurrentUserRecorder) {
                this.showCompletedPopup();
            }
        },
        showInfoPopup() {
            update((state) => ({
                ...state,
                shouldShowInfoPopup: true,
            }));
        },
        hideInfoPopup() {
            update((state) => ({
                ...state,
                shouldShowInfoPopup: false,
            }));
        },
        showCompletedPopup() {
            update((state) => ({
                ...state,
                shouldShowCompletedPopup: true,
            }));
        },
        hideCompletedPopup() {
            update((state) => ({
                ...state,
                shouldShowCompletedPopup: false,
            }));
        },
        reset() {
            set(initialState);
        },

        quitSpace() {
            update((state) => {
                if (state.isCurrentUserRecorder) {
                    return initialState;
                }
                return state;
            });
        },
    };
}

export const recordingStore = createRecordingStore();
export const showRecordingList = writable(false);
