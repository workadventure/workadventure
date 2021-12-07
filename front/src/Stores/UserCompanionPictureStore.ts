import { writable, Writable } from "svelte/store";

/**
 * A store that contains the player companion picture
 */
export class UserCompanionPictureStore {
    constructor(public picture: Writable<string | undefined> = writable(undefined)) {}
}
