import { derived, writable } from "svelte/store";

/**
 * The names of the spaces the local user has raised their hand in.
 *
 * A hand is raised in one space, not everywhere: a player can be in a bubble and listen to a megaphone at the
 * same time, and the hand meant for the bubble must not show up in the megaphone's queue. Toggling this store is
 * the single source of the raise-hand action: each space's SpacePeerManager sends it to its own space when it
 * differs from the space state (the queue lives in the space state).
 */
function createRequestedHandRaiseState() {
    const { subscribe, update, set } = writable<ReadonlySet<string>>(new Set());

    const without = (spaces: ReadonlySet<string>, spaceName: string) =>
        new Set([...spaces].filter((name) => name !== spaceName));

    return {
        subscribe,
        raise: (spaceName: string) => update((spaces) => new Set([...spaces, spaceName])),
        lower: (spaceName: string) => update((spaces) => (spaces.has(spaceName) ? without(spaces, spaceName) : spaces)),
        toggle: (spaceName: string) =>
            update((spaces) => (spaces.has(spaceName) ? without(spaces, spaceName) : new Set([...spaces, spaceName]))),
        lowerAll: () => set(new Set()),
    };
}

export const requestedHandRaiseState = createRequestedHandRaiseState();

/** Whether the local user's hand is up in at least one space (their woka and the action bar button). */
export const isHandRaisedStore = derived(requestedHandRaiseState, (spaces) => spaces.size > 0);
