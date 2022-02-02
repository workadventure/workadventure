import { writable } from "svelte/store";

export function createColorStore() {
    const { subscribe, set } = writable<number | undefined>(undefined);

    let followColor: number | undefined = undefined;
    let apiColor: number | undefined = undefined;

    let pointedByPointer: boolean = false;
    let pointedByCharacter: boolean = false;

    const updateColor = () => {
        if (pointedByPointer || pointedByCharacter) {
            set(0xffff00);
        } else {
            set(followColor ?? apiColor);
        }
    };

    return {
        subscribe,

        pointerOver() {
            pointedByPointer = true;
            updateColor();
        },

        pointerOut() {
            pointedByPointer = false;
            updateColor();
        },

        characterCloseBy() {
            pointedByCharacter = true;
            updateColor();
        },

        characterFarAway() {
            pointedByCharacter = false;
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
