import { writable } from "svelte/store";

/** Presenter cursor tools mirrored to viewers over the shared screen. "none" = no tool active. */
export type PresenterTool = "none" | "laser" | "spotlight" | "loupe";

export type ActivePresenterTool = Exclude<PresenterTool, "none">;

export function isActivePresenterTool(tool: string): tool is ActivePresenterTool {
    return tool === "laser" || tool === "spotlight" || tool === "loupe";
}

/** The effect a viewer should currently render for a given presenter (spaceUserId). */
export type PresenterEffectState = {
    tool: ActivePresenterTool;
    /** Cursor position normalized (0..1) against the visible shared video area. */
    x: number;
    y: number;
    /** Loupe magnification factor / spotlight radius fraction; 0 = viewer default. */
    scale: number;
};

/** The LOCAL user's currently selected presenter tool (drives the presenter bridge + HUD state). */
export const presenterToolStore = writable<PresenterTool>("none");

/** Per-presenter (targetUserId → effect) map that viewers render on the shared-screen tile. */
export const presenterEffectsStore = writable<Map<string, PresenterEffectState>>(new Map());

export function setPresenterEffect(targetUserId: string, state: PresenterEffectState): void {
    presenterEffectsStore.update((map) => {
        const next = new Map(map);
        next.set(targetUserId, state);
        return next;
    });
}

export function clearPresenterEffect(targetUserId: string): void {
    presenterEffectsStore.update((map) => {
        if (!map.has(targetUserId)) {
            return map;
        }
        const next = new Map(map);
        next.delete(targetUserId);
        return next;
    });
}

export function resetPresenterEffects(): void {
    presenterToolStore.set("none");
    presenterEffectsStore.set(new Map());
}
