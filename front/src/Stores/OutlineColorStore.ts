import { writable } from "svelte/store";

export function createColorStore() {
    const { subscribe, set } = writable<number | undefined>(undefined);

    let color: number | undefined = undefined;
    let focused: boolean = false;

    const updateColor = () => {
        if (focused) {
            set(0xffff00);
        } else {
            set(color);
        }
    };

    return {
        subscribe,

        pointerOver() {
            focused = true;
            updateColor();
        },

        pointerOut() {
            focused = false;
            updateColor();
        },

        setColor(newColor: number) {
            color = newColor;
            updateColor();
        },

        removeColor() {
            color = undefined;
            updateColor();
        },
    };
}
