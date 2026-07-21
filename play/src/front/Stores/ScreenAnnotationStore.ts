import { writable } from "svelte/store";
import type { ScreenAnnotationElement } from "@workadventure/messages";

/**
 * Stores and pure mutators for the "annotation on screen sharing" feature.
 *
 * Drawings are kept per shared screen, keyed by the `spaceUserId` of the user who is
 * sharing it (the "target"). This allows several simultaneous screen shares without
 * mixing annotations.
 *
 * These mutators are called both by local user actions and by remote events received
 * through {@link ScreenAnnotationManager}. They never emit anything by themselves.
 */

// UI tool selection. "pen" | "line" | "arrow" | "rect" | "text" produce drawable elements;
// "eraser" is an interaction mode that removes elements and never creates one.
export const ANNOTATION_TOOLS = ["pen", "line", "arrow", "rect", "text", "eraser"] as const;
export type AnnotationTool = (typeof ANNOTATION_TOOLS)[number];

// Per target screen share: the ordered list of drawable elements.
export const screenAnnotationElementsStore = writable<Map<string, ScreenAnnotationElement[]>>(new Map());

// Per target screen share: whether the presenter currently allows other users to annotate.
export const screenAnnotationEnabledStore = writable<Map<string, boolean>>(new Map());

// Local tool selection (the local user has a single active tool, shared across targets).
export const currentAnnotationToolStore = writable<AnnotationTool>("pen");
export const currentAnnotationColorStore = writable<string>("#ff3b30");
// Stroke width normalized against the smallest side of the visible video area.
export const currentAnnotationWidthStore = writable<number>(0.005);
// Whether the local user is currently in drawing mode on the focused screen share.
export const localAnnotationActiveStore = writable<boolean>(false);

// Local-only visibility toggle: when true, annotations are not RENDERED on this client (WA tiles
// and the desktop overlay), but everyone else keeps drawing and seeing them — nothing is emitted.
export const screenAnnotationLocallyHiddenStore = writable<boolean>(false);

export const ANNOTATION_COLORS = ["#ff3b30", "#ffcc00", "#34c759", "#0a84ff", "#ffffff", "#1c1c1e"] as const;

/**
 * Add a new element or replace an existing one with the same id.
 * The replace-by-id behaviour is what powers progressive rendering: while a stroke is
 * being drawn, the same id is re-sent with a growing list of points.
 */
export function upsertAnnotationElement(targetUserId: string, element: ScreenAnnotationElement): void {
    screenAnnotationElementsStore.update((map) => {
        const next = new Map(map);
        const elements = next.get(targetUserId) ?? [];
        const index = elements.findIndex((existing) => existing.id === element.id);
        const nextElements =
            index === -1 ? [...elements, element] : elements.map((e, i) => (i === index ? element : e));
        next.set(targetUserId, nextElements);
        return next;
    });
}

/** Remove a single element by id (undo / eraser). */
export function removeAnnotationElement(targetUserId: string, elementId: string): void {
    screenAnnotationElementsStore.update((map) => {
        const elements = map.get(targetUserId);
        if (!elements) {
            return map;
        }
        const next = new Map(map);
        next.set(
            targetUserId,
            elements.filter((element) => element.id !== elementId),
        );
        return next;
    });
}

/** Remove every element of a given screen share. */
export function clearAnnotations(targetUserId: string): void {
    screenAnnotationElementsStore.update((map) => {
        if (!map.has(targetUserId)) {
            return map;
        }
        const next = new Map(map);
        next.delete(targetUserId);
        return next;
    });
}

/** Record whether the presenter allows others to annotate the given screen share. */
export function setAnnotationEnabled(targetUserId: string, enabled: boolean): void {
    screenAnnotationEnabledStore.update((map) => {
        if (map.get(targetUserId) === enabled) {
            return map;
        }
        const next = new Map(map);
        next.set(targetUserId, enabled);
        return next;
    });
}

/** Reset every annotation state (called when the proximity space is destroyed). */
export function resetAllAnnotations(): void {
    screenAnnotationElementsStore.set(new Map());
    screenAnnotationEnabledStore.set(new Map());
    localAnnotationActiveStore.set(false);
    screenAnnotationLocallyHiddenStore.set(false);
}
