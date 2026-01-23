import { writable } from "svelte/store";
import RecordingCompletedModal from "../Components/PopUp/Recording/RecordingCompletedToast.svelte";
import RecordingStartedToast from "../Components/PopUp/Recording/RecordingStartedToast.svelte";
import { toastStore } from "./ToastStore";

interface RecordingState {
    isRecording: boolean;
    isCurrentUserRecorder: boolean;
    currentUserRecorderName: string;
}

const initialState: RecordingState = {
    isRecording: false,
    isCurrentUserRecorder: false,
    currentUserRecorderName: "unknown",
};

function createRecordingStore() {
    const { subscribe, update, set } = writable<RecordingState>(initialState);

    return {
        subscribe,
        isRecording: initialState.isRecording,
        isCurrentUserRecorder: initialState.isCurrentUserRecorder,
        startRecord(isCurrentUser: boolean = false, recorderName: string) {
            update((state) => ({
                ...state,
                isRecording: true,
                isCurrentUserRecorder: isCurrentUser,
                currentUserRecorderName: recorderName,
            }));

            console.log("startRecord", recorderName);

            if (!isCurrentUser) this.showInfoPopup(recorderName);
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
        },
    };
}

export const recordingStore = createRecordingStore();
export const showRecordingList = writable(false);
