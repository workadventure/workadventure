import { writable } from "svelte/store";

export const userMovingStore = writable(false);

export const requestVisitCardsStore = writable<string | null>(null);

export const userIsAdminStore = writable(false);

export const userIsJitsiDominantSpeakerStore = writable(false);

export const jitsiParticipantsCountStore = writable(0);

export const limitMapStore = writable(false);
