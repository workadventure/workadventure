import { writable } from "svelte/store";

export interface HandRaiseState {
    raised: boolean;
    // Epoch ms when the hand was raised locally. Used to order the LOCAL user among the raised hands.
    // Remote users are ordered using the server-stamped `handRaisedAt` field of their SpaceUser.
    raisedAt: number;
}

/**
 * Holds whether the local user has currently raised their hand.
 * Toggling this store is the single source of the raise-hand action: a subscriber in the GameScene
 * forwards it to the server (which mirrors it onto the woka via PlayerDetails and onto the video tiles
 * via the SpaceUser), and `localSpaceUser` derives the local tile state from it.
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
