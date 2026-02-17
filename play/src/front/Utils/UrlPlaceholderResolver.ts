import { gameManager } from "../Phaser/Game/GameManager";

function removeTrailingSlash(url: string): string {
    return url.replace(/\/$/, "");
}

export function resolveUrlPlaceholders(rawUrl: string, mapStorageUrl?: string): string {
    const playUrl = removeTrailingSlash(new URL("/", window.location.origin).toString());

    let url = rawUrl.replaceAll("{play_url}", playUrl);

    if (url.includes("{map_storage_url}")) {
        const resolvedMapStorageUrlCandidate =
            mapStorageUrl ?? gameManager.getCurrentGameScene().room.mapStorageUrl?.toString();
        if (resolvedMapStorageUrlCandidate === undefined) {
            throw new Error("No map storage URL found while resolving URL.");
        }
        url = url.replaceAll("{map_storage_url}", removeTrailingSlash(resolvedMapStorageUrlCandidate));
    }

    return url;
}
