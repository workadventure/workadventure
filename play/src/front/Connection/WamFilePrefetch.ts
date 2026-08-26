import { connectionManager } from "./ConnectionManager";
import { axiosWithRetry } from "./AxiosUtils";

/**
 * Starts downloading the WAM file as soon as the room is known, instead of waiting for Phaser to
 * boot and reach GameScene.preload().
 *
 * The WAM was never loaded through Phaser's Loader — it is a plain axios GET, only *sequenced* by
 * the loader through superLoad.loadPromise. So nothing stops it from starting earlier: its URL
 * comes from the /room response, which App.svelte already asks for as it mounts.
 *
 * Handed over exactly once. A GameScene is re-created on portals, on room changes and after a
 * reconnection, and each of those must see the WAM as it is *then* — a lasting cache would serve a
 * stale map-editor state. Taking the prefetch out of the box makes the second load a normal fetch.
 */

let prefetched: { url: string; response: Promise<unknown> } | undefined;

function absoluteWamUrl(wamUrl: string): string {
    return new URL(wamUrl, window.location.href).toString();
}

export function prefetchWamFile(): void {
    connectionManager
        .startGameConnexion()
        .then((result) => {
            // A redirect (URL) or an error carries no room to prefetch for.
            if (result instanceof URL || result.nextScene === "errorScene") {
                return;
            }
            const wamUrl = result.room.wamUrl;
            if (!wamUrl) {
                // Plain TMJ map: nothing to prefetch, the loader handles it.
                return;
            }
            const url = absoluteWamUrl(wamUrl);
            const response = axiosWithRetry.get(url).then((res: { data: unknown }) => res.data);
            // The consumer attaches the real handling; this only keeps a prefetch nobody claimed
            // (an aborted boot, a redirect landing first) from surfacing as an unhandled rejection.
            response.catch(() => {
                // claimed by takePrefetchedWamFile, or deliberately dropped
            });
            prefetched = { url, response };
        })
        .catch(() => {
            // Room resolution failures are handled by GameManager.init.
        });
}

/**
 * Claim the prefetched WAM for this URL, if it is the one we anticipated. Returns undefined when
 * there is nothing to claim, and the caller fetches normally.
 */
export function takePrefetchedWamFile(absoluteUrl: string): Promise<unknown> | undefined {
    if (prefetched?.url !== absoluteUrl) {
        return undefined;
    }
    const { response } = prefetched;
    prefetched = undefined;
    return response;
}
