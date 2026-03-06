import { writable } from "svelte/store";

interface TranscriptionState {
    isTranscribing: boolean;
    isCurrentUserTranscriber: boolean;
}

const initialState: TranscriptionState = {
    isTranscribing: false,
    isCurrentUserTranscriber: false,
};

function createTranscriptionStore() {
    const { subscribe, update, set } = writable<TranscriptionState>(initialState);

    return {
        subscribe,
        startTranscription(isCurrentUser: boolean = false) {
            update((state) => ({
                ...state,
                isTranscribing: true,
                isCurrentUserTranscriber: isCurrentUser,
            }));
        },
        stopTranscription() {
            update((state) => ({
                ...state,
                isTranscribing: false,
                isCurrentUserTranscriber: false,
            }));
        },
        reset() {
            set(initialState);
        },
    };
}

export const transcriptionStore = createTranscriptionStore();
