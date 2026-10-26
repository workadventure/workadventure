import { derived, writable } from "svelte/store";
import type { ScreenAnnotationElement } from "@workadventure/messages";

/**
 * Stores of the "annotation on screen sharing" feature.
 *
 * Drawings are kept per shared screen, keyed by the `spaceUserId` of the user who is
 * sharing it (the "target"). This allows several simultaneous screen shares without
 * mixing annotations. {@link ScreenAnnotationManager} publishes them from the space state.
 */

// UI tool selection. "pen" | "line" | "arrow" | "rect" | "text" produce drawable elements;
// "eraser" removes elements; "pointer" only broadcasts an ephemeral position. Neither is persisted.
export const ANNOTATION_TOOLS = ["pointer", "pen", "line", "arrow", "rect", "text", "eraser"] as const;
export type AnnotationTool = (typeof ANNOTATION_TOOLS)[number];

export function isAnnotationTool(tool: string): tool is AnnotationTool {
    return (ANNOTATION_TOOLS as readonly string[]).includes(tool);
}

// Per target screen share: the ordered list of drawable elements (finished ones, then the others' drafts).
export const screenAnnotationElementsStore = writable<Map<string, ScreenAnnotationElement[]>>(new Map());

// Per target screen share: whether the presenter currently allows other users to annotate.
export const screenAnnotationEnabledStore = writable<Map<string, boolean>>(new Map());

// Local tool selection (the local user has a single active tool, shared across targets).
export const currentAnnotationToolStore = writable<AnnotationTool>("pen");
export const currentAnnotationColorStore = writable<string>("#ff3b30");
// Stroke width normalized against the smallest side of the visible video area.
export const currentAnnotationWidthStore = writable<number>(0.005);
// The screen share (its presenter's spaceUserId) the local user is drawing on: undefined out of drawing mode.
export const localAnnotationTargetStore = writable<string | undefined>(undefined);
export const localAnnotationActiveStore = derived(localAnnotationTargetStore, (target) => target !== undefined);

// Local-only visibility toggle: when true, annotations are not RENDERED on this client (WA tiles
// and the desktop overlay), but everyone else keeps drawing and seeing them — nothing is emitted.
export const screenAnnotationLocallyHiddenStore = writable<boolean>(false);

export const ANNOTATION_COLORS = ["#ff3b30", "#ffcc00", "#34c759", "#0a84ff", "#ffffff", "#1c1c1e"] as const;

/** Reset every annotation state (called when the proximity space is destroyed). */
export function resetAllAnnotations(): void {
    screenAnnotationElementsStore.set(new Map());
    screenAnnotationEnabledStore.set(new Map());
    localAnnotationTargetStore.set(undefined);
    screenAnnotationLocallyHiddenStore.set(false);
}
