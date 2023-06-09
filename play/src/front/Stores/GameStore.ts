import { writable, derived } from "svelte/store";
import { BannerEvent } from "./../Api/Events/Ui/BannerEvent";

export const userMovingStore = writable(false);

export const requestVisitCardsStore = writable<string | null>(null);

export const userIsAdminStore = writable(false);
export const userIsEditorStore = writable(false);

export const userIsJitsiDominantSpeakerStore = writable(false);

export const jitsiParticipantsCountStore = writable(0);

export const limitMapStore = writable(false);

export const userHasAccessToBackOfficeStore = derived(
    [userIsAdminStore, userIsEditorStore],
    ([$userIsAdminStore, $userIsEditorStore]) => {
        return $userIsAdminStore || $userIsEditorStore;
    }
);

export const bannerStore = writable<BannerEvent | null>(null);
