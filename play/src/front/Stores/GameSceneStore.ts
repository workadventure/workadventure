import { writable } from "svelte/store";
import { GameScene } from "../Phaser/Game/GameScene";
import { ExtensionModule } from "../ExternalModule/ExtensionModule";
import { waitForStoreValue } from "./Utils/waitForStoreValue";

export const gameSceneIsLoadedStore = writable(false);

export const gameSceneStore = writable<GameScene | undefined>(undefined);

export const waitForGameSceneStore = () => {
    return waitForStoreValue(gameSceneStore);
};

const initExtensionModuleStore = () => {
    const { subscribe, update, set } = writable<ExtensionModule[]>([]);
    return {
        subscribe,
        update,
        set,
        add: (extensionModule: ExtensionModule) => {
            extensionModuleStore.update((extensionModules) => {
                extensionModules.push(extensionModule);
                return extensionModules;
            });
        },
    };
};
export const extensionModuleStore = initExtensionModuleStore();
export const extensionActivateComponentModuleStore = writable<boolean>(false);
