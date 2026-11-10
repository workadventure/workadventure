import type { DesktopRecentWorld } from "@workadventure/desktop-api";

/** A tile: a recent world shows its URL under its name, a world found for an email its organization (or nothing). */
export type RowWorld = { url: string; label: string; detail: string; thumbnail?: string; pinned?: boolean };

function isWorld(world: unknown): world is DesktopRecentWorld {
    const candidate = world as Partial<DesktopRecentWorld> | null;
    return typeof candidate?.url === "string" && typeof candidate.label === "string";
}

// Pinned worlds lead the row, then the rest in recency order; a pinned world must not appear
// twice when it is also recent.
export function mergeWorlds(pinned: unknown, recent: unknown): DesktopRecentWorld[] {
    const merged = new Map<string, DesktopRecentWorld>();
    for (const [list, forcePinned] of [
        [pinned, true],
        [recent, false],
    ] as const) {
        for (const world of Array.isArray(list) ? list : []) {
            if (isWorld(world) && !merged.has(world.url)) {
                merged.set(world.url, {
                    url: world.url,
                    label: world.label,
                    pinned: forcePinned || Boolean(world.pinned),
                });
            }
        }
    }
    return [...merged.values()];
}

// No map image exists for an arbitrary world, so each tile gets a stable look derived from its
// URL: same world, same colour and grid offset on every launch, and two worlds are very
// unlikely to collide. Cheap stand-in for the real art, and it never leaves a card blank.
export function hashString(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash << 5) - hash + value.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}
