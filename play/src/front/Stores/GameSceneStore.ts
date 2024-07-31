import { writable } from "svelte/store";
import { GameScene } from "../Phaser/Game/GameScene";
import { ExtensionModule } from "../../extension-module/extension-module";

export const gameSceneIsLoadedStore = writable(false);

export const gameSceneStore = writable<GameScene | undefined>(undefined);

export const extensionModuleStore = writable<ExtensionModule | undefined>(undefined);
export const extensionActivateComponentModuleStore = writable<boolean>(false);
