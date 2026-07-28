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
    /** Active presenter tool: "none" | "laser" | "spotlight" | "loupe". */
    presenterTool?: string;
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
    | { type: "annotation-toggle-others" }
    | { type: "presenter-set-tool"; tool: string };

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

    // ── Meeting video (WebRTC) — the companion hosts the peer connection and answers the WA
    // renderer's offer, so the meeting tiles render as HTML <video> in the companion instead of a
    // separate native PiP view. Only the companion uses these; the presenter bars ignore them. ──
    /** WA renderer's SDP offer (relayed by main). */
    onMeetingOffer: (callback: (sdp: RTCSessionDescriptionInit) => void) => () => void;
    /** ICE candidate from the WA renderer (relayed by main). */
    onMeetingIce: (callback: (candidate: RTCIceCandidateInit) => void) => () => void;
    /** Tile metadata (participant → tileKey/trackId, mic/cam), pushed on every change. */
    onMeetingTiles: (callback: (state: unknown) => void) => () => void;
    /** The WA renderer tore the meeting video down — clear the tiles. */
    onMeetingClose: (callback: () => void) => () => void;
    /** Send the SDP answer back to the WA renderer (via main). */
    sendMeetingAnswer: (sdp: RTCSessionDescriptionInit) => void;
    /** Send a local ICE candidate back to the WA renderer (via main). */
    sendMeetingIce: (candidate: RTCIceCandidateInit) => void;
};

declare global {
    interface Window {
        WAHud?: WorkAdventureHudApi;
    }
}

export {};
