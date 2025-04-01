import { derived } from "svelte/store";
import { visibilityStore } from "../../../Stores/VisibilityStore";

/**
 * A store containing whether the PictureInPicture is visible or not.
 */
export const pictureInPictureStore = derived(visibilityStore, ($visibilityStore) => {
    return !$visibilityStore;
});
