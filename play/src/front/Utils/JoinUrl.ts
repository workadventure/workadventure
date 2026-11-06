import { gameManager } from "../Phaser/Game/GameManager";

/** The area named in "#moveTo=<area>", or undefined. */
export function moveTargetOf(joinUrl: string): string | undefined {
    try {
        return new URLSearchParams(new URL(joinUrl).hash.slice(1)).get("moveTo") ?? undefined;
    } catch {
        return undefined;
    }
}

/**
 * Goes to a place of this WorkAdventure without reloading the page: walks to its area on the current map,
 * or travels to its map. Returns false when the link leaves this origin or the area cannot be found.
 */
export function goToJoinUrl(joinUrl: string): boolean {
    let url: URL;
    try {
        url = new URL(joinUrl);
    } catch {
        return false;
    }
    if (url.origin !== window.location.origin) return false;
    const scene = gameManager.getCurrentGameScene();
    if (url.pathname === window.location.pathname) {
        const target = moveTargetOf(joinUrl);
        return target === undefined || scene.walkToMoveTarget(target);
    }
    scene.onMapExit(url).catch((e) => console.error(e));
    return true;
}
