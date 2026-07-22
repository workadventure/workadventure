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
    /**
     * Validate the URL and load the world in the main desktop window. Successful room
     * navigations are persisted as `last_room_url` by the main process.
     */
    joinWorld: (url: string) => Promise<DesktopNavigationResult>;
    /** Return up to 10 worlds, ordered by most recent visit. */
    getRecentWorlds: () => Promise<DesktopRecentWorld[]>;
    /** Return the user's pinned worlds, most recently pinned first. */
    getPinnedWorlds: () => Promise<DesktopRecentWorld[]>;
    /** Pin/unpin a world; resolves to the new pinned state. */
    togglePin: (url: string) => Promise<{ ok: boolean; pinned?: boolean; error?: string }>;
    /** Whether a world is currently pinned. */
    isPinned: (url: string) => Promise<boolean>;
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

/**
 * Rich notification payload used by the enriched `WorkAdventureDesktopApi.notify` path. Main
 * creates the OS notification with the WA icon and wires a click handler that focuses the main
 * window, emitting `onNotificationClick(tag)` back to the renderer so it can route to the right
 * room / conversation.
 */
export type DesktopNotificationPayload = {
    title: string;
    body: string;
    /**
     * Groups notifications so the OS coalesces subsequent ones with the same tag (e.g. per chat
     * room) instead of stacking them. Also passed to `onNotificationClick` when the notif is
     * clicked.
     */
    tag?: string;
    /** Silent notifications don't play a sound / bounce the dock. */
    silent?: boolean;
};

/** A room/nearby participant shown in the companion People tab. */
export type CompanionUser = {
    id: string;
    name: string;
    /** Availability key ("online" | "busy" | "back_in_a_moment" | "do_not_disturb" | "offline"). */
    status: string;
    /** Status dot color (hex); optional — the panel has a fallback per status key. */
    color?: string;
    isSelf: boolean;
    /** True when this user is in the local user's current proximity meeting. */
    inBubble?: boolean;
};

/** A chat message shown in the companion's selected conversation. */
export type CompanionMessage = {
    id: string;
    author: string;
    text: string;
    isSelf: boolean;
};

/** A conversation summary in the companion Chat list (nearby proximity + Matrix DMs / rooms). */
export type CompanionConversation = {
    id: string;
    name: string;
    kind: "nearby" | "direct" | "room";
    /** Last message preview (may be empty). */
    preview: string;
    /** Timestamp used to sort the list (most recent first). */
    lastActivityAt: number;
    unreadCount: number;
    /** Unread @-mentions / highlights, distinct from plain unread. */
    highlightCount: number;
};

/** The currently-open conversation and its recent messages. */
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

/** A pending meeting invitation shown as a banner in the companion. */
export type CompanionInvitation = {
    name: string;
};

/** Full state pushed to the companion panel on every change. */
export type CompanionState = {
    world: { name: string; participantCount: number };
    users: CompanionUser[];
    /** Chat conversations (nearby + Matrix), sorted most-relevant first. */
    conversations: CompanionConversation[];
    /** The open conversation + its messages, or null/absent when the list is shown. */
    selectedConversation?: CompanionSelectedConversation | null;
    media: CompanionMedia;
    /** Set when a meeting invitation is pending; null/absent otherwise. */
    invitation?: CompanionInvitation | null;
};

/** User actions raised by the companion panel, routed back to the active world renderer. */
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

/**
 * Drives the companion panel — a compact, interactive quick-access window (People / Chat / Controls
 * / Mentions) shown when WA is backgrounded. The active world renderer feeds it state and handles
 * the commands it raises. Pure IPC (no media capture), so it is safe across tabs.
 */
export type WorkAdventureDesktopCompanionApi = {
    /** Push the current companion state to the panel (no-op if the panel is closed). */
    pushState: (state: CompanionState) => void;
    /** Subscribe to commands raised by the panel. Returns an unsubscriber. */
    onCommand: (callback: (command: CompanionCommand) => void) => () => void;
};

export type WorkAdventureDesktopApi = {
    desktop: boolean;
    isDevelopment: () => Promise<boolean>;
    getVersion: () => Promise<string>;
    /**
     * Show an OS notification. Plain string keeps backward compat with the older `notify(body)`
     * call site; the object form adds title, click routing (`tag`) and silence control.
     */
    notify: (payload: string | DesktopNotificationPayload) => void;
    /**
     * Subscribe to notification-click events. The tag is the same value passed to `notify`; use
     * it to route to the originating chat room / world / etc. Returns an unsubscriber.
     */
    onNotificationClick: (callback: (tag: string | undefined) => void) => () => void;
    /**
     * Keep the display awake while the user is in an active proximity meeting. Main manages a
     * single powerSaveBlocker; toggle on entry / off on leave (idempotent).
     */
    setKeepAwake: (enabled: boolean) => void;
    /**
     * Update the dock (macOS) / taskbar (Windows) unread badge. Pass 0 to clear. Linux is a
     * silent no-op — X11/Wayland have no cross-DE badge primitive.
     */
    setUnreadCount: (count: number) => void;
    /**
     * Push the live presence (in-meeting + mic/camera state + availability) to main, which drives
     * the tray status dot, the tray quick-action checkmarks, and the tray "Set status" submenu.
     * `requestedStatus` is the user's chosen availability; `statusLocked` mirrors WA locking the
     * status bar while in a meeting / silent zone (the submenu grays out in that case).
     */
    setPresence: (presence: {
        inMeeting: boolean;
        micEnabled: boolean;
        cameraEnabled: boolean;
        screenSharing: boolean;
        /** True while a game scene is loaded (gates the companion auto-show to actual worlds). */
        inWorld?: boolean;
        /** True while a meeting invitation is pending — force-opens the companion for its banner. */
        invitationPending?: boolean;
        requestedStatus?: "online" | "busy" | "back_in_a_moment" | "do_not_disturb";
        statusLocked?: boolean;
    }) => void;
    /**
     * Subscribe to status changes requested from the tray "Set status" submenu. The renderer maps
     * the key back to an AvailabilityStatus and applies it. Returns an unsubscriber.
     */
    onSetStatus: (callback: (status: "online" | "busy" | "back_in_a_moment" | "do_not_disturb") => void) => () => void;
    /** Set the current world's display name on the active tab (admin-configured room name). */
    setTabTitle: (title: string) => void;
    /**
     * Subscribe to system idle/active transitions (main polls powerMonitor + screen-lock events).
     * The renderer uses this to auto-set the WA availability to "away" and back. Returns an
     * unsubscriber.
     */
    onSystemIdle: (callback: (idle: boolean) => void) => () => void;
    /**
     * Presenter tools: main tracks the global cursor over the shared display and streams it here
     * so the renderer can mirror the effect (laser / spotlight / loupe) to viewers.
     */
    presenter: {
        /**
         * Start tracking for the given tool on the shared display; "none" stops tracking. Pass the
         * capture sourceId (`screen:<id>`) so main can resolve the display when display_id is
         * absent (e.g. Wayland) instead of falling back to the primary screen.
         */
        setTool: (tool: "none" | "laser" | "spotlight" | "loupe", displayId?: number, sourceId?: string) => void;
        /** Normalized (0..1) cursor position over the shared display. Returns an unsubscriber. */
        onCursor: (callback: (x: number, y: number) => void) => () => void;
    };
    onMuteToggle: (callback: () => void) => void;
    onCameraToggle: (callback: () => void) => void;
    getWindowState: () => Promise<DesktopWindowState>;
    onWindowStateChange: (callback: (state: DesktopWindowState) => void) => () => void;
    getDesktopCapturerSources: (options: SourcesOptions) => Promise<DesktopCapturerSource[]>;
    pip?: WorkAdventureDesktopPipApi;
    navigation: WorkAdventureDesktopNavigationApi;
    screenOverlay?: WorkAdventureDesktopOverlayApi;
    presenterHud?: WorkAdventureDesktopHudApi;
    companion?: WorkAdventureDesktopCompanionApi;
};
