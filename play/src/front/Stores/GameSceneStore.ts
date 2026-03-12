import { writable } from "svelte/store";
import type { GameScene } from "../Phaser/Game/GameScene.ts";
import type { ExtensionModule } from "../ExternalModule/ExtensionModule.ts";
import { waitForStoreValue } from "./Utils/waitForStoreValue.ts";

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
