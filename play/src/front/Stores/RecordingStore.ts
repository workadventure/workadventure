import { writable } from 'svelte/store';

interface RecordingState {
    isRecording: boolean;
    isCurrentUserSharing: boolean;
}

const initialState: RecordingState = {
    isRecording: false,
    isCurrentUserSharing: false,
};

export const recordingStore = writable<RecordingState>(initialState);

export function setRecording(isRecording: boolean) {
    recordingStore.update(state => ({ ...state, isRecording }));
}

export function setCurrentUserSharing(isCurrentUserSharing: boolean) {
    recordingStore.update(state => ({ ...state, isCurrentUserSharing }));
}

