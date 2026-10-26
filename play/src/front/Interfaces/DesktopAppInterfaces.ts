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
    getRecentWorlds?: () => Promise<DesktopRecentWorld[]>;
    getPinnedWorlds?: () => Promise<DesktopRecentWorld[]>;
    togglePin?: (url: string) => Promise<{ ok: boolean; pinned?: boolean; error?: string }>;
    isPinned?: (url: string) => Promise<boolean>;
    openAdminSignup: () => Promise<DesktopNavigationResult>;
};

export type DesktopNotificationPayload = {
    title: string;
    body: string;
    /** Groups OS notifications so subsequent ones with the same tag replace instead of stacking. */
    tag?: string;
    /** Silent notifications don't play a sound / bounce the dock. */
    silent?: boolean;
};

/** A meeting of the day in the companion's Today view; texts formatted by the world. */
export type CompanionAgendaMeeting = {
    id: string;
    title: string;
    /** Start time, "10:45". */
    time: string;
    /** "in 12 minutes · Google Meet", "In progress · until 10:30 · WorkAdventure". */
    detail: string;
    live: boolean;
    /** In progress or starting within the hour: the strip under the header. */
    soon: boolean;
    joinable: boolean;
    /** Takes place in this WorkAdventure: joining brings the app to the front. */
    inApp: boolean;
};

/** An open task in the companion's Today view (read-only, like in WorkAdventure). */
export type CompanionAgendaTask = {
    id: string;
    title: string;
    /** The task list it belongs to. */
    list: string;
    inProgress: boolean;
    /** "Yesterday", "Today", "Fri 16"; absent without a due date. */
    due?: string;
    urgency: "late" | "today" | "later";
};

/** Each part is absent when the world has no calendar / no task list connected. */
export type CompanionAgenda = {
    meetings?: CompanionAgendaMeeting[];
    tasks?: { open: number; items: CompanionAgendaTask[] };
};

/** The floating windows the world page renders as child windows. */
export type DesktopChildWindowKind = "companion" | "meeting-bar" | "annotation";

/**
 * The companion and the meeting bar: child windows of the world page that the page renders itself.
 * The desktop app decides when they open; the page opens them on request and moves the meeting video
 * into the companion when told.
 */
export type WorkAdventureDesktopWindowsApi = {
    /** Optional native screen overlay; absent on older shells and Linux. No business state crosses IPC. */
    setAnnotationState?: (state: { visible: boolean; interactive: boolean; trackCursor: boolean }) => void;
    onAnnotationCursor?: (callback: (x: number, y: number) => void) => () => void;
    /** Main asks the page to open a window: `window.open("about:blank", "wa-companion" | "wa-meeting-bar")`. */
    onOpen: (callback: (kind: DesktopChildWindowKind) => void) => () => void;
    /** The app wants the meeting video in the companion (true) or not any more (false). */
    onMeetingWanted: (callback: (wanted: boolean) => void) => () => void;
    /** The PiP button: open or close the companion by hand. */
    toggleCompanion: () => void;
    /** WA's profile menu: open the companion by hand (it stays when WA shows again, a second call keeps it). */
    openCompanion: () => void;
    /** The companion's close button: closed until the user comes back to WorkAdventure. */
    dismissCompanion: () => void;
    /** Bring the WorkAdventure window to the front. */
    focusMain: () => void;
    /** Whether a window shows in the user's own screen share (it cannot be hidden from it). */
    visibleInShare: (sharing: boolean) => boolean;
    /** Whether the desktop tab strip shows (the meeting bar's "Display tabs"). */
    tabStripShown: () => Promise<boolean>;
    toggleTabStrip: () => void;
};

export type WorkAdventureDesktopApi = {
    desktop: boolean;
    /**
     * The handshake, on every page load: the page says which contract it speaks, the app answers with its
     * own. Absent on desktop apps of contract 1 (older than the handshake); null for a page the app does
     * not take as a world.
     */
    hello?: (page: { contract: number }) => { contract: number } | null;
    isDevelopment: () => Promise<boolean>;
    getVersion: () => Promise<string>;
    /** Contract 1 (frozen): an OS notification whose body is the text, titled "WorkAdventure". */
    notify: (text: string) => void;
    /** A notification with a title, click routing (tag) and silence. Absent on desktop shells of contract 1. */
    notifyMessage?: (payload: DesktopNotificationPayload) => void;
    /** Subscribe to notification-click events (tag is the value passed to notifyMessage). */
    onNotificationClick?: (callback: (tag: string | undefined) => void) => () => void;
    /** Keep the display awake while in an active meeting. Main manages a single blocker id. */
    setKeepAwake?: (enabled: boolean) => void;
    /** Dock (macOS) / taskbar (Windows) unread badge; 0 clears. Linux is a silent no-op. */
    setUnreadCount?: (count: number) => void;
    /** Push live presence (meeting + mic/camera + screen-share + availability) to main for the tray dot and the floating windows. */
    setPresence?: (presence: {
        inMeeting: boolean;
        micEnabled: boolean;
        cameraEnabled: boolean;
        screenSharing: boolean;
        inWorld?: boolean;
        onboarding?: boolean;
        invitationPending?: boolean;
        /** The "Allow picture-in-picture" setting: the companion may open by itself during a meeting. */
        autoOpenAllowed?: boolean;
        requestedStatus?: "online" | "busy" | "back_in_a_moment" | "do_not_disturb";
    }) => void;
    /** The screen the user shares (null: none), so that the companion never opens by itself over it. */
    setScreenShareSource?: (source: { sourceId: string; displayId?: number } | null) => void;
    /**
     * Main asks this renderer to re-send its presence. The shell keeps one global presence for the
     * active tab and clears it on a tab switch, so a world that only pushes on change needs this to
     * re-sync when it becomes active again. Returns an unsubscriber.
     */
    onRequestPresence?: (callback: () => void) => () => void;
    /** Set the current world's display name on the active tab. */
    setTabTitle?: (title: string) => void;
    /** Subscribe to system idle/active transitions (main powerMonitor). Returns unsubscriber. */
    onSystemIdle?: (callback: (idle: boolean) => void) => () => void;
    /** Another tab entered a meeting: turn off microphone, camera and screen share here. */
    onMediaPreempted?: (callback: () => void) => () => void;
    /** This world entered a meeting and media was turned off in another tab, named here. */
    onOtherMeetingMuted?: (callback: (worldName: string) => void) => () => void;
    onMuteToggle: (callback: () => void) => void;
    onCameraToggle: (callback: () => void) => void;
    /** Absent where the system picks the source (Linux under Wayland): getDisplayMedia is used instead. */
    getDesktopCapturerSources?: (options: SourcesOptions) => Promise<DesktopCapturerSource[]>;
    /**
     * Open a big-numbered, click-to-share overlay on every physical display and resolve the screen
     * source the user clicks (null on Escape). Optional: absent on older desktop shells, so callers
     * must feature-detect before offering the "click a screen" affordance.
     */
    identifyScreens?: () => Promise<DesktopCapturerSource | null>;
    /** Dismiss any open "identify screens" overlays (no-op if none). Optional; absent on older shells. */
    cancelIdentifyScreens?: () => void;
    navigation?: WorkAdventureDesktopNavigationApi;
    windows?: WorkAdventureDesktopWindowsApi;
    /** macOS screen recording permission ("not-needed" elsewhere). Absent on older desktop shells. */
    screenPermission?: {
        get: () => Promise<"granted" | "missing" | "not-needed">;
        request: () => Promise<"granted" | "missing" | "not-needed">;
        /** Before a share: true when it can go on, else the shell explained and offered the settings or a restart. */
        ensure: () => Promise<boolean>;
    };
};
