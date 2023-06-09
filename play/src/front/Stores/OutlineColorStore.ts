import { writable } from "svelte/store";

export function createColorStore() {
    const { subscribe, set } = writable<number | undefined>(undefined);

    let followColor: number | undefined = undefined;
    let apiColor: number | undefined = undefined;
    let editColor: number | undefined = undefined;
    let pointedToEditColor: number | undefined = undefined;
    let pointedByPointer: number | undefined = undefined;
    let pointedByCharacter: number | undefined = undefined;

    const updateColor = () => {
        set(editColor ?? pointedToEditColor ?? pointedByPointer ?? pointedByCharacter ?? followColor ?? apiColor);
    };

    return {
        subscribe,

        setEditColor(color: number) {
            editColor = color;
            updateColor();
        },

        removeEditColor() {
            editColor = undefined;
            updateColor();
        },

        setPointedToEditColor(color: number) {
            pointedToEditColor = color;
            updateColor();
        },

        removePointedToEditColor() {
            pointedToEditColor = undefined;
            updateColor();
        },

        pointerOver(color: number) {
            pointedByPointer = color;
            updateColor();
        },

        pointerOut() {
            pointedByPointer = undefined;
            updateColor();
        },

        characterCloseBy(color: number) {
            pointedByCharacter = color;
            updateColor();
        },

        characterFarAway() {
            pointedByCharacter = undefined;
            updateColor();
        },

        setFollowColor(newColor: number) {
            followColor = newColor;
            updateColor();
        },

        removeFollowColor() {
            followColor = undefined;
            updateColor();
        },

        setApiColor(newColor: number) {
            apiColor = newColor;
            updateColor();
        },

        removeApiColor() {
            apiColor = undefined;
            updateColor();
        },
    };
}
