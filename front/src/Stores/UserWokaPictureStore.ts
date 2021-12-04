import { writable, Writable } from "svelte/store";

/**
 * A store that contains the player avatar picture
 */
export class UserWokaPictureStore {
    constructor(public picture: Writable<string | undefined> = writable(undefined)) {}
}
