// copy of Electron.SourcesOptions to avoid Electron dependency in front
export interface SourcesOptions {
    types: string[];
    thumbnailSize?: { height: number; width: number };
}

export interface DesktopCapturerSource {
    id: string;
    name: string;
    thumbnailURL: string;
    /** Electron Display.id of the screen this source represents (screen sources only). */
    display_id?: number;
}

export interface DesktopWindowState {
    focused: boolean;
    visible: boolean;
    minimized: boolean;
}

export type DesktopPipSdp = {
    type: "offer" | "answer" | "pranswer" | "rollback";
    sdp?: string;
};

export type DesktopPipTile = {
    /** Stable per-streamable id. Used by the PiP renderer to dedupe and reconcile placeholders. */
    tileKey: string;
    /** Empty string when this is a placeholder tile (peer present but no video track published). */
    trackId: string;
    name: string;
    isSelf: boolean;
    hasAudio: boolean;
    hasVideo: boolean;
};

/** A proximity-chat message mirrored into the floating desktop window. */
export type DesktopPipChatMessage = {
    id: string;
    author: string;
    text: string;
    isSelf: boolean;
};

/**
 * Screen-annotation toolbar state pushed to the floating window. The drawing surface itself is a
 * separate transparent overlay window; this only carries the control state.
 */
export type DesktopPipAnnotationState = {
    available: boolean;
    active: boolean;
    tool: string;
    color: string;
};

export type DesktopPipState = {
    tiles: DesktopPipTile[];
    micEnabled: boolean;
    cameraEnabled: boolean;
    screenSharing: boolean;
    canScreenShare: boolean;
    recording?: boolean;
    canRecord?: boolean;
    chatMessages?: DesktopPipChatMessage[];
    annotation?: DesktopPipAnnotationState;
};

export type DesktopPipCommand =
    | { type: "toggle-mic" }
    | { type: "toggle-camera" }
    | { type: "toggle-screenshare" }
    | { type: "pick-source"; sourceId: string; sourceName: string; displayId?: number }
    | { type: "focus-main" }
    | { type: "close" }
    | { type: "send-chat"; text: string }
    | { type: "send-reaction"; emote: string }
    | { type: "annotation-toggle" }
    | { type: "annotation-set-tool"; tool: string }
    | { type: "annotation-set-color"; color: string }
    | { type: "annotation-undo" }
    | { type: "annotation-clear" }
    | { type: "annotation-toggle-local-hide" }
    | { type: "annotation-toggle-others" };

export type WorkAdventureDesktopPipApi = {
    readonly supported: true;
    open: () => Promise<boolean>;
    close: () => Promise<void>;
    sendOffer: (sdp: DesktopPipSdp) => void;
    sendIce: (candidate: RTCIceCandidateInit) => void;
    sendState: (state: DesktopPipState) => void;
    onAnswer: (callback: (sdp: DesktopPipSdp) => void) => () => void;
    onIce: (callback: (candidate: RTCIceCandidateInit) => void) => () => void;
    onClosed: (callback: () => void) => () => void;
    onRequestClose: (callback: () => void) => () => void;
    onCommand: (callback: (command: DesktopPipCommand) => void) => () => void;
};

export type DesktopNavigationResult = { ok: true } | { ok: false; error: string };

export type DesktopRecentWorld = {
    url: string;
    label: string;
};

export type WorkAdventureDesktopNavigationApi = {
    /**
     * Validate the URL and load the world in the main desktop window. Successful room
     * navigations are persisted as `last_room_url` by the main process.
     */
    joinWorld: (url: string) => Promise<DesktopNavigationResult>;
    /** Return up to 10 worlds, ordered by most recent visit. */
    getRecentWorlds: () => Promise<DesktopRecentWorld[]>;
    /** Open the admin signup URL in the OS default browser. */
    openAdminSignup: () => Promise<DesktopNavigationResult>;
};

export type DesktopOverlayPoint = { x: number; y: number };

export type DesktopOverlayElement = {
    id: string;
    authorUserId: string;
    tool: string;
    color: string;
    width: number;
    points: DesktopOverlayPoint[];
    text?: string;
};

export type DesktopOverlayToolState = {
    tool: string;
    color: string;
    width: number;
};

export type DesktopOverlayDrawOp =
    | { type: "upsert"; element: DesktopOverlayElement; commit: boolean }
    | { type: "remove"; id: string }
    | { type: "undo" }
    | { type: "clear" };

/** Drives the transparent screen-annotation overlay window from the main renderer. */
export type WorkAdventureDesktopOverlayApi = {
    open: (opts: { displayId?: number; sourceId?: string }) => Promise<boolean>;
    close: () => Promise<void>;
    setDrawMode: (enabled: boolean) => void;
    setTool: (tool: DesktopOverlayToolState) => void;
    pushElements: (elements: DesktopOverlayElement[]) => void;
    onDraw: (callback: (op: DesktopOverlayDrawOp) => void) => () => void;
    onExit: (callback: () => void) => () => void;
};

/**
 * State pushed to the floating presenter HUD windows (meeting bar + annotation bar) shown on the
 * shared screen. Both windows are content-protected: visible to the presenter, excluded from the
 * captured pixels.
 */
export type DesktopPresenterHudState = {
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

/**
 * Drives the presenter HUD (Zoom-style meeting bar + separate annotation bar), placed on the
 * shared display. Commands raised by the bars reuse the {@link DesktopPipCommand} union.
 */
export type WorkAdventureDesktopHudApi = {
    openMeetingBar: (opts: { displayId?: number; sourceId?: string }) => Promise<boolean>;
    closeMeetingBar: () => Promise<void>;
    openAnnotationBar: (opts: { displayId?: number; sourceId?: string }) => Promise<boolean>;
    closeAnnotationBar: () => Promise<void>;
    pushState: (state: DesktopPresenterHudState) => void;
    onCommand: (callback: (command: DesktopPipCommand) => void) => () => void;
};

export type WorkAdventureDesktopApi = {
    desktop: boolean;
    isDevelopment: () => Promise<boolean>;
    getVersion: () => Promise<string>;
    notify: (txt: string) => void;
    onMuteToggle: (callback: () => void) => void;
    onCameraToggle: (callback: () => void) => void;
    getWindowState: () => Promise<DesktopWindowState>;
    onWindowStateChange: (callback: (state: DesktopWindowState) => void) => () => void;
    getDesktopCapturerSources: (options: SourcesOptions) => Promise<DesktopCapturerSource[]>;
    pip?: WorkAdventureDesktopPipApi;
    navigation: WorkAdventureDesktopNavigationApi;
    screenOverlay?: WorkAdventureDesktopOverlayApi;
    presenterHud?: WorkAdventureDesktopHudApi;
};
