import { writable } from "svelte/store";

/** True while the Phaser PwaInstallScene is active (Svelte full-screen UI). */
export const pwaInstallSceneVisibleStore = writable(false);
