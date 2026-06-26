import type { Readable } from "svelte/store";
import { writable } from "svelte/store";

export interface AudioInterruptedStore extends Readable<boolean> {
    setInterrupted: (interrupted: boolean) => void;
}

export function createAudioInterruptedStore(): AudioInterruptedStore {
    const interrupted = writable(false);

    return {
        subscribe: interrupted.subscribe,
        setInterrupted: interrupted.set,
    };
}

export const audioInterruptedStore = createAudioInterruptedStore();
