// Protocol between the main process and the transparent screen-annotation overlay window.
// Mirrors the shape of the WorkAdventure ScreenAnnotation vector model, but kept dependency-free
// so the sandboxed overlay renderer stays isolated.

export type OverlayPoint = { x: number; y: number };

/** A drawable annotation element, in normalized 0..1 coordinates over the shared screen. */
export type OverlayElement = {
    id: string;
    authorUserId: string;
    tool: string;
    color: string;
    width: number;
    points: OverlayPoint[];
    text?: string;
};

/** The local drawing tool state pushed to the overlay so freshly drawn strokes use it. */
export type OverlayToolState = {
    tool: string;
    color: string;
    width: number;
};

/**
 * The presenter's live cursor effect, rendered on the overlay so the PRESENTER sees what the
 * audience sees. The overlay is content-protected, so this local render is never captured — the
 * viewers get the effect from the network channel instead, with no double-render.
 */
export type OverlayPresenterEffect = {
    /** "laser" | "spotlight" | "loupe". Only meaningful when active. */
    tool: string;
    /** Cursor position normalized 0..1 over the shared display. */
    x: number;
    y: number;
    /** Loupe/spotlight parameter (radius fraction / zoom); 0 = renderer default. */
    scale: number;
    /** False clears the effect. */
    active: boolean;
};

/** A drawing operation produced BY the overlay when the presenter draws, sent back to WorkAdventure. */
export type OverlayDrawOp =
    | { type: "upsert"; element: OverlayElement; commit: boolean }
    | { type: "remove"; id: string }
    | { type: "undo" }
    | { type: "clear" };

export type WorkAdventureOverlayApi = {
    /** Full set of elements to render (mirrors the presenter's annotation store). */
    onElements: (callback: (elements: OverlayElement[]) => void) => () => void;
    /** Whether the overlay currently captures pointer input (draw mode) or is click-through. */
    onDrawMode: (callback: (enabled: boolean) => void) => () => void;
    /** Current tool/color/width for new strokes. */
    onTool: (callback: (tool: OverlayToolState) => void) => () => void;
    /** The presenter's live cursor effect (laser / spotlight / loupe) to render locally. */
    onPresenterEffect: (callback: (effect: OverlayPresenterEffect) => void) => () => void;
    /** Emit a drawing operation back to the main renderer. */
    emitDraw: (op: OverlayDrawOp) => void;
    /** Ask the user to leave drawing mode (e.g. the overlay caught Escape). */
    requestExit: () => void;
    /** Signal the renderer has wired all its subscriptions and is ready to receive pushes. */
    ready: () => void;
};

declare global {
    interface Window {
        WAOverlay?: WorkAdventureOverlayApi;
    }
}

export {};
