import {derived, writable} from "svelte/store";
import {streamableCollectionStore} from "./StreamableCollectionStore";
import {ExtensionModule} from "../ExternalModule/ExtensionModule";
import {extensionModuleStore} from "./GameSceneStore";

const createMaxVisibleVideosStore = () => {
    // Initialiser avec une valeur par défaut de 0
    const { subscribe, set } = writable<number>(0);
    let currentValue = 0;

    return {
        subscribe,
        set: (value: number) => {
            // Only update the store if the value has changed
            if (currentValue !== value) {
                currentValue = value;
                set(value);
            }
        },
    };
};

export const maxVisibleVideosStore = createMaxVisibleVideosStore();

// TODO: CONTINUE HERE
// TODO: CONTINUE HERE
// TODO: CONTINUE HERE
// TODO: CONTINUE HERE
// TODO: CONTINUE HERE
// TODO: CONTINUE HERE
// TODO: CONTINUE HERE
// TODO: CONTINUE HERE
// TODO: CONTINUE HERE
// TODO: CONTINUE HERE
// TODO: CONTINUE HERE
// TODO: CONTINUE HERE
// TODO: CONTINUE HERE
// TODO: CONTINUE HERE
const currentOrderForStore =

export const orderedStreamableCollectionStore = derived([streamableCollectionStore, maxVisibleVideosStore], ([$streamableCollectionStore, $maxVisibleVideosStore]) => {

});