import { derived, writable } from "svelte/store";
import { ForwardableStore } from "@workadventure/store-utils";
import { localUserStore } from "../Connection/LocalUserStore";
import type { VideoBox } from "../Space/VideoBox";
import { usesPictureInPictureLayout } from "../Components/Video/PictureInPicture/PictureInPictureAvailabilityPolicy";
import type { RaisedHandSection, SpaceInterface } from "../Space/SpaceInterface";

export const videoStreamStore = new ForwardableStore<Map<string, VideoBox>>(new Map<string, VideoBox>());
export const screenShareStreamStore = new ForwardableStore<Map<string, VideoBox>>(new Map<string, VideoBox>());

// The raised hands and floor holders of each space, one section per space (SpaceRegistry.raisedHandSectionsStore).
// Sourced from the space state, so they reach every participant — even a megaphone speaker without seeAttendees.
export const raisedHandSectionsStore = new ForwardableStore<RaisedHandSection[]>([]);

// Spaces the local user syncs their media with (SpaceRegistry.spacesSynchronizingMedia): where a hand can be raised.
export const mediaSynchronizedSpacesStore = new ForwardableStore<SpaceInterface[]>([]);

export const videoStreamElementsStore = derived(videoStreamStore, ($videoStreamStore) => {
    return Array.from($videoStreamStore.values());
});

export const screenShareStreamElementsStore = derived(screenShareStreamStore, ($screenShareStreamStore) => {
    return Array.from($screenShareStreamStore.values());
});

export const volumeProximityDiscussionStore = writable(localUserStore.getVolumeProximityDiscussion());

export const activePictureInPictureStore = writable(false);
/** The videos take the picture-in-picture layout: in the browser only, see usesPictureInPictureLayout. */
export const pictureInPictureLayoutStore = derived(activePictureInPictureStore, ($active) =>
    usesPictureInPictureLayout(
        $active,
        typeof window !== "undefined" && Boolean(window.WAD?.desktop && window.WAD.pip),
    ),
);
export const askPictureInPictureActivatingStore = writable(false);
export const pictureInPictureSupportedStore = writable(true);
