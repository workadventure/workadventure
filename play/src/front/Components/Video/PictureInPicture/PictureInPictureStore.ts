import { derived } from "svelte/store";
import { visibilityStore } from "../../../Stores/VisibilityStore";
import { localUserStore } from "../../../Connection/LocalUserStore";

/**
 * A store containing whether the PictureInPicture is visible or not.
 */
export const pictureInPictureStore = derived(visibilityStore, ($visibilityStore) => {
    if (!localUserStore.getAllowPictureInPicture()) {
        return false;
    }
    return !$visibilityStore;
});
