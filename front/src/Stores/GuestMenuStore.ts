import { writable } from "svelte/store";
import { gameManager } from "../Phaser/Game/GameManager";
import { startLayerNamesStore } from "./StartLayerNamesStore";

export const walkAutomaticallyStore = writable<boolean>(false);

export function copyLink() {
    const input: HTMLInputElement = document.getElementById("input-share-link") as HTMLInputElement;
    input.focus();
    input.select();
    document.execCommand("copy");
}

export function getLink() {
    let startLayerName: string[] = [];
    startLayerNamesStore.subscribe((value) => {
        startLayerName = value;
    });
    const entryPoint: string | null = startLayerName.length > 0 ? startLayerName[0] : null;
    const currentPlayer = gameManager.getCurrentGameScene().CurrentPlayer;
    const playerPos = { x: Math.floor(currentPlayer.x), y: Math.floor(currentPlayer.y) };

    let walkAutomatically = false;
    walkAutomaticallyStore.subscribe((value) => {
        walkAutomatically = value;
    });

    return `${location.origin}${location.pathname}${entryPoint ? `#${entryPoint}` : ""}${
        walkAutomatically ? `&moveTo=${playerPos.x},${playerPos.y}` : ""
    }`;
}

export function updateInputFieldValue() {
    const input = document.getElementById("input-share-link");
    if (input) {
        (input as HTMLInputElement).value = getLink();
    }
}

export const canShare = navigator.share !== undefined;

export async function shareLink() {
    const shareData = { url: getLink() };

    try {
        await navigator.share(shareData);
    } catch (err) {
        console.error("Error: " + err);
        copyLink();
    }
}
