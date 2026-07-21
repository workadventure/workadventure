// Protocol between the main process and the presenter HUD windows (meeting bar + annotation bar).
// Kept dependency-free so the sandboxed HUD renderers stay isolated.

/** Mirrors DesktopPresenterHudState in preload-app/types.ts (and the play front). */
export type HudState = {
    micEnabled: boolean;
    cameraEnabled: boolean;
    screenSharing: boolean;
    annotation: {
        active: boolean;
        tool: string;
        color: string;
        othersCanDraw: boolean;
        locallyHidden: boolean;
    };
};

/** Commands raised by the bars; a subset/mirror of DesktopPipCommand on the WorkAdventure side. */
export type HudCommand =
    | { type: "toggle-mic" }
    | { type: "toggle-camera" }
    | { type: "toggle-screenshare" }
    | { type: "pick-source"; sourceId: string; sourceName: string; displayId?: number }
    | { type: "focus-main" }
    | { type: "annotation-toggle" }
    | { type: "annotation-set-tool"; tool: string }
    | { type: "annotation-set-color"; color: string }
    | { type: "annotation-undo" }
    | { type: "annotation-clear" }
    | { type: "annotation-toggle-local-hide" }
    | { type: "annotation-toggle-others" };

export type HudSource = {
    id: string;
    name: string;
    thumbnailURL: string;
    type: "screen" | "window";
    display_id?: number;
};

export type WorkAdventureHudApi = {
    /** Full presenter state (mic/camera/share/annotation), pushed on every change. */
    onState: (callback: (state: HudState) => void) => () => void;
    /** Send a user action back to the WorkAdventure renderer. */
    sendCommand: (command: HudCommand) => void;
    /** Enumerate shareable screens/windows (for the direct screen-switch picker). */
    requestSources: () => Promise<HudSource[]>;
    /** Grow/shrink the meeting bar window so the source picker fits (bottom edge stays anchored). */
    setExpanded: (expanded: boolean) => void;
    /** Signal the renderer has wired all its subscriptions and is ready to receive pushes. */
    ready: () => void;
};

declare global {
    interface Window {
        WAHud?: WorkAdventureHudApi;
    }
}

export {};
