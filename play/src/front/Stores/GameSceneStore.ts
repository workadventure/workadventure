import { writable } from "svelte/store";
import { GameScene } from "../Phaser/Game/GameScene";

export const gameSceneIsLoadedStore = writable(false);

export const gameSceneStore = writable<GameScene | undefined>(undefined);
