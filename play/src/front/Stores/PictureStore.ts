import type { Readable } from "svelte/store";

/**
 * A store that contains the player/companion avatar picture
 */
export type PictureStore = Readable<string | undefined>;
