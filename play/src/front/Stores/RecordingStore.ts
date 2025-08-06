import { writable } from 'svelte/store';

interface RecordingState {
    isRecording: boolean;
    shouldShowInfoPopup: boolean;
    isCurrentUserRecorder: boolean;
}

const initialState: RecordingState = {
    isRecording: false,
    shouldShowInfoPopup: false,
    isCurrentUserRecorder: false,
};

function createRecordingStore() {
    const { subscribe, update, set } = writable<RecordingState>(initialState);

    return {
        subscribe,
        shouldShowInfoPopup: initialState.shouldShowInfoPopup,
        isRecording: initialState.isRecording,
        isCurrentUserRecorder: initialState.isCurrentUserRecorder,
        startRecord(isCurrentUser: boolean = false) {
            update(state => ({
                ...state,
                isRecording: true,
                isCurrentUserRecorder: isCurrentUser
            }));
            if (!isCurrentUser) this.showInfoPopup();
        },
        stopRecord() {
            update(state => ({
                ...state,
                isRecording: false,
                isCurrentUserRecorder: false
            }));
            this.hideInfoPopup();
        },
        showInfoPopup() {
            update(state => ({
                ...state,
                shouldShowInfoPopup: true
            }));
        },
        hideInfoPopup() {
            update(state => ({
                ...state,
                shouldShowInfoPopup: false
            }));
        },
        reset() {
            set(initialState);
        }
    };
}

export const recordingStore = createRecordingStore();
export const showRecordingList = writable(false);