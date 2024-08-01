import { writable } from "svelte/store";
import { ExtensionModule } from "@workadventure/shared-utils";
import { GameScene } from "../Phaser/Game/GameScene";

export const gameSceneIsLoadedStore = writable(false);

export const gameSceneStore = writable<GameScene | undefined>(undefined);

export const extensionModuleStore = writable<ExtensionModule | undefined>(undefined);
export const extensionActivateComponentModuleStore = writable<boolean>(false);
