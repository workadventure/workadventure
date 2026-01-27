import { writable } from "svelte/store";

interface RecordingState {
    isRecording: boolean;
    shouldShowInfoPopup: boolean;
    isCurrentUserRecorder: boolean;
    currentUserRecorderName: string;
}

const initialState: RecordingState = {
    isRecording: false,
    shouldShowInfoPopup: false,
    isCurrentUserRecorder: false,
    currentUserRecorderName: "unknown",
};

function createRecordingStore() {
    const { subscribe, update, set } = writable<RecordingState>(initialState);

    return {
        subscribe,
        shouldShowInfoPopup: initialState.shouldShowInfoPopup,
        isRecording: initialState.isRecording,
        isCurrentUserRecorder: initialState.isCurrentUserRecorder,
        startRecord(isCurrentUser: boolean = false, recorderName: string) {
            update((state) => ({
                ...state,
                isRecording: true,
                isCurrentUserRecorder: isCurrentUser,
                currentUserRecorderName: recorderName,
            }));

            if (!isCurrentUser) this.showInfoPopup();
        },
        stopRecord() {
            update((state) => ({
                ...state,
                isRecording: false,
                isCurrentUserRecorder: false,
            }));
            this.hideInfoPopup();
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
