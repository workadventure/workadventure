import { writable } from "svelte/store";

export interface HandRaiseState {
    raised: boolean;
    // Epoch ms when the hand was raised locally. The queue order itself is the server's (space state).
    raisedAt: number;
}

/**
 * Holds whether the local user has currently raised their hand.
 * Toggling this store is the single source of the raise-hand action: SpacePeerManager sends it to each
 * space it differs from (the queue lives in the space state), and `localSpaceUser` derives the local tile
 * state from it.
 */
function createRequestedHandRaiseState() {
    const { subscribe, set, update } = writable<HandRaiseState>({ raised: false, raisedAt: 0 });

    return {
        subscribe,
        raiseHand: () => set({ raised: true, raisedAt: Date.now() }),
        lowerHand: () => set({ raised: false, raisedAt: 0 }),
        toggle: () =>
            update((state) => (state.raised ? { raised: false, raisedAt: 0 } : { raised: true, raisedAt: Date.now() })),
    };
}

export const requestedHandRaiseState = createRequestedHandRaiseState();
