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
    /** True when the local user shares a screen that can be annotated. */
    available: boolean;
    /** True when drawing mode is currently active. */
    active: boolean;
    /** Current tool: "pen" | "line" | "arrow" | "rect" | "text" | "eraser". */
    tool: string;
    /** Current stroke color (hex). */
    color: string;
};

export type DesktopPipState = {
    tiles: DesktopPipTile[];
    micEnabled: boolean;
    cameraEnabled: boolean;
    screenSharing: boolean;
    canScreenShare: boolean;
    /** Optional: recording state (true if a recording is currently active). */
    recording?: boolean;
    canRecord?: boolean;
    /** Recent proximity-chat messages (oldest first) shown in the floating window. */
    chatMessages?: DesktopPipChatMessage[];
    /** Screen-annotation toolbar state (drawing happens on a separate overlay window). */
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
    | { type: "annotation-toggle-others" }
    | { type: "presenter-set-tool"; tool: string };

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
    pinned: boolean;
};

export type WorkAdventureDesktopNavigationApi = {
    joinWorld: (url: string) => Promise<DesktopNavigationResult>;
    getRecentWorlds: () => Promise<DesktopRecentWorld[]>;
    getPinnedWorlds?: () => Promise<DesktopRecentWorld[]>;
    togglePin?: (url: string) => Promise<{ ok: boolean; pinned?: boolean; error?: string }>;
    isPinned?: (url: string) => Promise<boolean>;
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
        /** True while the presenter is in drawing mode (annotation bar open). */
        active: boolean;
        tool: string;
        color: string;
        /** Whether other participants are allowed to draw on this share. */
        othersCanDraw: boolean;
        /** Local-only render toggle: annotations hidden on THIS client, others keep drawing. */
        locallyHidden: boolean;
    };
    /** Active presenter cursor tool: "none" | "laser" | "spotlight" | "loupe". */
    presenterTool?: string;
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

export type DesktopNotificationPayload = {
    title: string;
    body: string;
    /** Groups OS notifications so subsequent ones with the same tag replace instead of stacking. */
    tag?: string;
    /** Silent notifications don't play a sound / bounce the dock. */
    silent?: boolean;
};

/** A room/nearby participant shown in the companion People tab. */
export type CompanionUser = {
    id: string;
    name: string;
    status: string;
    color?: string;
    isSelf: boolean;
    inBubble?: boolean;
};

export type CompanionMessage = {
    id: string;
    author: string;
    text: string;
    isSelf: boolean;
};

export type CompanionConversation = {
    id: string;
    name: string;
    kind: "nearby" | "direct" | "room";
    preview: string;
    lastActivityAt: number;
    unreadCount: number;
    highlightCount: number;
};

export type CompanionSelectedConversation = {
    id: string;
    name: string;
    messages: CompanionMessage[];
};

export type CompanionMedia = {
    micEnabled: boolean;
    cameraEnabled: boolean;
    screenSharing: boolean;
    canScreenShare: boolean;
    inMeeting: boolean;
    status: "online" | "busy" | "back_in_a_moment" | "do_not_disturb";
    statusLocked: boolean;
};

export type CompanionInvitation = {
    name: string;
};

export type CompanionState = {
    world: { name: string; participantCount: number };
    users: CompanionUser[];
    conversations: CompanionConversation[];
    selectedConversation?: CompanionSelectedConversation | null;
    media: CompanionMedia;
    invitation?: CompanionInvitation | null;
};

export type CompanionCommand =
    | { type: "focus-main" }
    | { type: "close" }
    | { type: "toggle-mic" }
    | { type: "toggle-camera" }
    | { type: "toggle-screenshare" }
    | { type: "set-status"; status: "online" | "busy" | "back_in_a_moment" | "do_not_disturb" }
    | { type: "select-conversation"; conversationId: string }
    | { type: "send-message"; conversationId: string; text: string }
    | { type: "open-conversation-in-main"; conversationId: string }
    | { type: "dm"; userId: string }
    | { type: "locate"; userId: string }
    | { type: "accept-invitation" }
    | { type: "decline-invitation" };

/** Drives the companion quick-access panel (People / Chat / Controls / Mentions). */
export type WorkAdventureDesktopCompanionApi = {
    pushState: (state: CompanionState) => void;
    onCommand: (callback: (command: CompanionCommand) => void) => () => void;
};

export type WorkAdventureDesktopApi = {
    desktop: boolean;
    isDevelopment: () => Promise<boolean>;
    getVersion: () => Promise<string>;
    /** String form kept for backward compat; object form adds title, click routing (tag) and silence. */
    notify: (payload: string | DesktopNotificationPayload) => void;
    /** Subscribe to notification-click events (tag is the value passed to notify). */
    onNotificationClick?: (callback: (tag: string | undefined) => void) => () => void;
    /** Keep the display awake while in an active meeting. Main manages a single blocker id. */
    setKeepAwake?: (enabled: boolean) => void;
    /** Dock (macOS) / taskbar (Windows) unread badge; 0 clears. Linux is a silent no-op. */
    setUnreadCount?: (count: number) => void;
    /** Push live presence (meeting + mic/camera + screen-share + availability) to main for the tray dot, floating toolbar and Set-status submenu. */
    setPresence?: (presence: {
        inMeeting: boolean;
        micEnabled: boolean;
        cameraEnabled: boolean;
        screenSharing: boolean;
        inWorld?: boolean;
        invitationPending?: boolean;
        requestedStatus?: "online" | "busy" | "back_in_a_moment" | "do_not_disturb";
        statusLocked?: boolean;
    }) => void;
    /** Subscribe to availability changes requested from the tray "Set status" submenu. */
    onSetStatus?: (callback: (status: "online" | "busy" | "back_in_a_moment" | "do_not_disturb") => void) => () => void;
    /** Set the current world's display name on the active tab. */
    setTabTitle?: (title: string) => void;
    /** Subscribe to system idle/active transitions (main powerMonitor). Returns unsubscriber. */
    onSystemIdle?: (callback: (idle: boolean) => void) => () => void;
    /** Presenter tools: main tracks the global cursor over the shared display and streams it here. */
    presenter?: {
        setTool: (tool: "none" | "laser" | "spotlight" | "loupe", displayId?: number, sourceId?: string) => void;
        onCursor: (callback: (x: number, y: number) => void) => () => void;
    };
    onMuteToggle: (callback: () => void) => void;
    onCameraToggle: (callback: () => void) => void;
    getWindowState: () => Promise<DesktopWindowState>;
    onWindowStateChange: (callback: (state: DesktopWindowState) => void) => () => void;
    getDesktopCapturerSources: (options: SourcesOptions) => Promise<DesktopCapturerSource[]>;
    pip?: WorkAdventureDesktopPipApi;
    navigation?: WorkAdventureDesktopNavigationApi;
    screenOverlay?: WorkAdventureDesktopOverlayApi;
    presenterHud?: WorkAdventureDesktopHudApi;
    companion?: WorkAdventureDesktopCompanionApi;
};
