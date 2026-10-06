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
    /** Base64 data URL of the participant's Woka; optional — the tile falls back to a colour disc. */
    woka?: string;
    /** True while the participant is speaking (voice indicator) — drives the active-speaker border. */
    speaking?: boolean;
    /** Local playback volume for this participant (0..1), for the tile menu's volume control. */
    volume?: number;
    /** True when the participant has a visit card (enables the "visit card" tile-menu action). */
    hasVisitCard?: boolean;
};

/** A proximity-chat message mirrored into the floating desktop window. */
export type DesktopPipChatMessage = {
    id: string;
    author: string;
    text: string;
    isSelf: boolean;
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
    /** True when the local user can moderate the meeting (mute-everybody / kick tile actions). */
    canModerate?: boolean;
    /** True when the local user may ask others to mute (non-admin ask-to-mute tile actions). */
    canAskToMute?: boolean;
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
    | { type: "pick-device"; kind: "camera" | "microphone"; deviceId: string };

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

/**
 * `trustOrigin`: the address is unknown to the portal's admin (a self-hosted server); only returned to
 * the native Landing, which may then offer to add that server (trustServerAndJoin).
 */
export type DesktopNavigationResult = { ok: true } | { ok: false; error: string; trustOrigin?: string };

export type DesktopRecentWorld = {
    url: string;
    label: string;
    pinned: boolean;
};

export type WorkAdventureDesktopNavigationApi = {
    joinWorld: (url: string) => Promise<DesktopNavigationResult>;
    /** Add a self-hosted server the user confirmed on the native Landing, then open the world. */
    trustServerAndJoin?: (url: string) => Promise<DesktopNavigationResult>;
    getRecentWorlds: () => Promise<DesktopRecentWorld[]>;
    getPinnedWorlds?: () => Promise<DesktopRecentWorld[]>;
    togglePin?: (url: string) => Promise<{ ok: boolean; pinned?: boolean; error?: string }>;
    isPinned?: (url: string) => Promise<boolean>;
    openAdminSignup: () => Promise<DesktopNavigationResult>;
};

/**
 * State pushed to the floating presenter HUD window (meeting bar) shown on the shared screen. It is
 * content-protected: visible to the presenter, excluded from the captured pixels.
 */
export type DesktopPresenterHudState = {
    micEnabled: boolean;
    cameraEnabled: boolean;
    screenSharing: boolean;
    /** Available cam/mic input devices + current selection, for the bar's "Change cam / mic" picker. */
    devices?: {
        cameras: { id: string; label: string }[];
        microphones: { id: string; label: string }[];
        currentCameraId?: string;
        currentMicrophoneId?: string;
    };
};

/**
 * Drives the presenter HUD (Zoom-style meeting bar), placed on the shared display. Commands raised by
 * the bar reuse the {@link DesktopPipCommand} union.
 */
export type WorkAdventureDesktopHudApi = {
    openMeetingBar: (opts: { displayId?: number; sourceId?: string }) => Promise<boolean>;
    closeMeetingBar: () => Promise<void>;
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
    /** Base64 data URL of the user's Woka avatar; optional — the panel falls back to a colour disc. */
    woka?: string;
};

export type CompanionMessage = {
    id: string;
    author: string;
    text: string;
    isSelf: boolean;
    /** Epoch ms of the message; 0 when unknown. Drives per-message time + date separators. */
    ts: number;
    /** Proximity system notice (e.g. "New discussion with X") — rendered centered, not as a bubble. */
    system?: boolean;
};

export type CompanionConversation = {
    id: string;
    name: string;
    kind: "nearby" | "direct" | "room";
    preview: string;
    lastActivityAt: number;
    unreadCount: number;
    highlightCount: number;
    /** Base64 data URL of the conversation avatar (e.g. the local Woka for the proximity chat). */
    woka?: string;
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
    pipOpen: boolean;
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
    /** Matrix chat availability, so the empty conversation list isn't mistaken for "no chat". */
    chatStatus?: "connecting" | "online" | "unavailable";
};

export type CompanionCommand =
    | { type: "focus-main" }
    | { type: "close" }
    | { type: "toggle-mic" }
    | { type: "toggle-camera" }
    | { type: "toggle-screenshare" }
    | { type: "toggle-pip" }
    | { type: "set-status"; status: "online" | "busy" | "back_in_a_moment" | "do_not_disturb" }
    | { type: "select-conversation"; conversationId: string }
    | { type: "send-message"; conversationId: string; text: string }
    | { type: "open-conversation-in-main"; conversationId: string }
    | { type: "dm"; userId: string }
    | { type: "locate"; userId: string }
    | { type: "invite"; userId: string }
    | {
          type: "tile-action";
          tileKey: string;
          action: "mute-audio" | "mute-video" | "mute-audio-all" | "mute-video-all" | "kick" | "report" | "visit-card";
      }
    | { type: "tile-volume"; tileKey: string; value: number }
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
    /**
     * Main asks this renderer to re-send its presence. The shell keeps one global presence for the
     * active tab and clears it on a tab switch, so a world that only pushes on change needs this to
     * re-sync when it becomes active again. Returns an unsubscriber.
     */
    onRequestPresence?: (callback: () => void) => () => void;
    /** Subscribe to availability changes requested from the tray "Set status" submenu. */
    onSetStatus?: (callback: (status: "online" | "busy" | "back_in_a_moment" | "do_not_disturb") => void) => () => void;
    /** Set the current world's display name on the active tab. */
    setTabTitle?: (title: string) => void;
    /** Push the companion / meeting bar strings in the WorkAdventure language (flat key → text). */
    setHudStrings?: (strings: Record<string, string>) => void;
    /** Subscribe to system idle/active transitions (main powerMonitor). Returns unsubscriber. */
    onSystemIdle?: (callback: (idle: boolean) => void) => () => void;
    /** Another tab entered a meeting: turn off microphone, camera and screen share here. */
    onMediaPreempted?: (callback: () => void) => () => void;
    /** This world entered a meeting and media was turned off in another tab, named here. */
    onOtherMeetingMuted?: (callback: (worldName: string) => void) => () => void;
    onMuteToggle: (callback: () => void) => void;
    onCameraToggle: (callback: () => void) => void;
    getWindowState: () => Promise<DesktopWindowState>;
    onWindowStateChange: (callback: (state: DesktopWindowState) => void) => () => void;
    getDesktopCapturerSources: (options: SourcesOptions) => Promise<DesktopCapturerSource[]>;
    /**
     * Open a big-numbered, click-to-share overlay on every physical display and resolve the screen
     * source the user clicks (null on Escape). Optional: absent on older desktop shells, so callers
     * must feature-detect before offering the "click a screen" affordance.
     */
    identifyScreens?: () => Promise<DesktopCapturerSource | null>;
    /** Dismiss any open "identify screens" overlays (no-op if none). Optional; absent on older shells. */
    cancelIdentifyScreens?: () => void;
    pip?: WorkAdventureDesktopPipApi;
    navigation?: WorkAdventureDesktopNavigationApi;
    presenterHud?: WorkAdventureDesktopHudApi;
    companion?: WorkAdventureDesktopCompanionApi;
};
