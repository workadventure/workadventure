import type { Readable } from "svelte/store";

/**
 * A store that contains the player/companion avatar picture
 */
export type PictureStore = Readable<string | undefined>;

export type LazyPictureStore = PictureStore & {
    load: () => Promise<void>;
    refresh: () => Promise<void>;
    invalidate: () => void;
    destroy?: () => void;
};

export function isLazyPictureStore(pictureStore: PictureStore | undefined): pictureStore is LazyPictureStore {
    return typeof (pictureStore as Partial<LazyPictureStore> | undefined)?.load === "function";
}
