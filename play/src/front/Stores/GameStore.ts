import { writable } from "svelte/store";
import type { BannerEvent } from "./../Api/Events/Ui/BannerEvent";

export const userMovingStore = writable(false);

// This store is used to determine whether the user is currently in the personal area or has left before loading the business card.
export const canRequestVisitCardsStore = writable(false);
export const requestVisitCardsStore = writable<string | null>(null);

export const userIsAdminStore = writable(false);
export const userIsEditorStore = writable(false);

export const userIsJitsiDominantSpeakerStore = writable(false);

export const jitsiParticipantsCountStore = writable(0);

export const limitMapStore = writable(false);

export const bannerStore = writable<BannerEvent | null>(null);

export const selectedChatIDRemotePlayerStore = writable<string | null>(null);
