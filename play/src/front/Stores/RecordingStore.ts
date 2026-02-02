import { writable } from "svelte/store";
import RecordingCompletedModal from "../Components/PopUp/Recording/RecordingCompletedToast.svelte";
import RecordingStartedToast from "../Components/PopUp/Recording/RecordingStartedToast.svelte";
import { toastStore } from "./ToastStore";

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
            toastStore.addToast(RecordingStartedToast, {}, "recording-started-toast");
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
        },
    };
}

export const recordingStore = createRecordingStore();
export const showRecordingList = writable(false);
