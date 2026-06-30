import { derived, writable } from "svelte/store";
import { ForwardableStore } from "@workadventure/store-utils";
import { localUserStore } from "../Connection/LocalUserStore";
import type { VideoBox } from "../Space/VideoBox";
import type { RaisedHand } from "../Space/SpaceInterface";

export const videoStreamStore = new ForwardableStore<Map<string, VideoBox>>(new Map<string, VideoBox>());
export const screenShareStreamStore = new ForwardableStore<Map<string, VideoBox>>(new Map<string, VideoBox>());

// Ordered queue of users who raised their hand in the current meeting space (sourced from the space metadata,
// so it reaches every participant — even a megaphone speaker without seeAttendees).
export const raisedHandsStore = new ForwardableStore<RaisedHand[]>([]);

export const videoStreamElementsStore = derived(videoStreamStore, ($videoStreamStore) => {
    return Array.from($videoStreamStore.values());
});

export const screenShareStreamElementsStore = derived(screenShareStreamStore, ($screenShareStreamStore) => {
    return Array.from($screenShareStreamStore.values());
});

export const volumeProximityDiscussionStore = writable(localUserStore.getVolumeProximityDiscussion());

export const activePictureInPictureStore = writable(false);
export const askPictureInPictureActivatingStore = writable(false);
export const pictureInPictureSupportedStore = writable(true);
