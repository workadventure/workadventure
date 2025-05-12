import { get, writable } from "svelte/store";
import { gameManager } from "../Phaser/Game/GameManager";

export const walkAutomaticallyStore = writable<boolean>(false);

export async function copyLink() {
    const input = document.getElementById("input-share-link");

    if (!(input instanceof HTMLInputElement)) {
        return;
    }

    await navigator.clipboard.writeText(input.value);
}

export function getLink(): string {
    const startLayerNames: string[] = gameManager.getCurrentGameScene().getStartPositionNames();
    const entryPoint: string | null = startLayerNames.length > 0 ? startLayerNames[0] : null;
    try {
        const currentPlayer = gameManager.getCurrentGameScene().CurrentPlayer;
        const playerPos = { x: Math.floor(currentPlayer.x), y: Math.floor(currentPlayer.y) };

        const walkAutomatically = get(walkAutomaticallyStore);

        return `${getRoomId()}${entryPoint ? `#${entryPoint}` : ""}${
            walkAutomatically ? `&moveTo=${playerPos.x},${playerPos.y}` : ""
        }`;
    } catch (err: unknown) {
        console.error("GuestMenuStore => getLink: ", err);
        return getRoomId();
    }
}

export function getRoomId(): string {
    return `${location.origin}${location.pathname}`;
}

export const canShare = navigator.share !== undefined;

export async function shareLink() {
    const shareData = { url: getLink() };

    try {
        await navigator.share(shareData);
    } catch (err) {
        console.error("Error: " + err);
        try {
            await copyLink();
        } catch (err2) {
            console.error("Error 2: " + err2);
        }
    }
}
