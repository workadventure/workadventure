/**
 * window.WAD: what the desktop app (desktop/electron, its preload) exposes to the pages it loads, the world
 * pages of play and the native Landing.
 *
 * Types only, with no import: play and the desktop app both compile this file, and nothing of it reaches
 * their bundles.
 *
 * It is a contract between versions: self-hosted servers stay on older releases while the app updates, and
 * an older app may load a newer server. Members added after contract 1 are optional, so a page checks them
 * before calling. A published member never goes away and never changes shape (contract.test.ts in the
 * desktop app): add a new member for a new shape.
 */

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

export type DesktopNavigationResult = { ok: true } | { ok: false; error: string };

export type DesktopRecentWorld = {
    url: string;
    label: string;
    pinned: boolean;
};

/** A world the WorkAdventure administration lists for an email, on the native Landing. */
export type DesktopFoundWorld = {
    name: string;
    organization: string;
    url: string;
    /** The default room's map thumbnail, when it has one. */
    thumbnail?: string;
};

export type DesktopFindWorldsResult = { ok: true; worlds: DesktopFoundWorld[] } | { ok: false; error: string };

/** A slice of the desktop's native catalog, in the OS language. */
export type DesktopNativeStrings = { lang: string; strings: Record<string, string> };

/** The members other than joinWorld and openAdminSignup are only exposed to the native Landing. */
export type WorkAdventureDesktopNavigationApi = {
    /**
     * Validate the URL and load the world in the main desktop window. Successful room
     * navigations are persisted as `last_room_url` by the main process. A world on a WorkAdventure
     * server the user has not added loads the native Landing instead, which asks whether to add it.
     */
    joinWorld: (url: string) => Promise<DesktopNavigationResult>;
    /** Add a server the user confirmed on the native Landing, then open the world. */
    trustServerAndJoin?: (url: string) => Promise<DesktopNavigationResult>;
    /** Return up to 10 worlds, ordered by most recent visit. */
    getRecentWorlds?: () => Promise<DesktopRecentWorld[]>;
    /** Return the user's pinned worlds, most recently pinned first. */
    getPinnedWorlds?: () => Promise<DesktopRecentWorld[]>;
    /** Pin/unpin a world; resolves to the new pinned state. */
    togglePin?: (url: string) => Promise<{ ok: boolean; pinned?: boolean; error?: string }>;
    /** Whether a world is currently pinned. */
    isPinned?: (url: string) => Promise<boolean>;
    /** Open the admin signup URL in the OS default browser. */
    openAdminSignup: () => Promise<DesktopNavigationResult>;
    /** The worlds the WorkAdventure administration knows for this email. */
    findWorlds?: (email: string) => Promise<DesktopFindWorldsResult>;
    /** Sign in, in the system browser, to a world the last `findWorlds` returned (by its `url`). */
    signInToWorld?: (url: string) => Promise<DesktopNavigationResult>;
    /**
     * The Landing's strings in the OS language (synchronous so the page never flashes English).
     * Null when called from anything but the native Landing page.
     */
    getStrings?: () => DesktopNativeStrings | null;
};

/**
 * Rich notification payload of `WorkAdventureDesktopApi.notifyMessage`. Main creates the OS notification
 * with the WA icon and wires a click handler that focuses the main window, emitting
 * `onNotificationClick(tag)` back to the renderer so it can route to the right room / conversation.
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

/**
 * The four user-selectable availability statuses, as stable string keys. Kept as strings (not the
 * numeric AvailabilityStatus enum of @workadventure/messages) so the desktop app needs no dependency on
 * it: the page maps to/from the enum on its side.
 */
export type DesktopAvailability = "online" | "busy" | "back_in_a_moment" | "do_not_disturb";

/**
 * The live presence the page pushes to main, which drives the tray status dot, the tray quick-action
 * checkmarks and the companion and meeting bar rules.
 */
export type DesktopPresence = {
    inMeeting: boolean;
    micEnabled: boolean;
    cameraEnabled: boolean;
    screenSharing: boolean;
    /** True while a game scene is loaded (gates the companion auto-show to actual worlds). */
    inWorld?: boolean;
    /** True while a first-connection screen (name, Woka, companion, camera) waits for the user. */
    onboarding?: boolean;
    /** True while a meeting invitation is pending — force-opens the companion for its banner. */
    invitationPending?: boolean;
    /** The "Allow picture-in-picture" setting: the companion may open by itself during a meeting. */
    autoOpenAllowed?: boolean;
    /** The user's chosen availability, shown by the tray dot. */
    requestedStatus?: DesktopAvailability;
};

/** The screen the user shares. */
export type DesktopScreenShareSource = { sourceId: string; displayId?: number };

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

/** The macOS screen recording permission a share needs ("not-needed" on the other systems). */
export type DesktopScreenPermission = "granted" | "missing" | "not-needed";

export interface WorkAdventureDesktopScreenPermissionApi {
    get: () => Promise<DesktopScreenPermission>;
    /** Lists the app in System Settings (macOS's prompt the first time) and opens the Screen Recording pane. */
    request: () => Promise<DesktopScreenPermission>;
    /** Before a share: true when it can go on, else a native dialog explains and offers the settings or a restart. */
    ensure: () => Promise<boolean>;
}

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
    /** An OS notification with a title, click routing (`tag`) and silence control. */
    notifyMessage?: (payload: DesktopNotificationPayload) => void;
    /**
     * Subscribe to notification-click events. The tag is the same value passed to `notifyMessage`; use
     * it to route to the originating chat room / world / etc. Returns an unsubscriber.
     */
    onNotificationClick?: (callback: (tag: string | undefined) => void) => () => void;
    /**
     * Keep the display awake while the user is in an active proximity meeting. Main manages a
     * single powerSaveBlocker; toggle on entry / off on leave (idempotent).
     */
    setKeepAwake?: (enabled: boolean) => void;
    /**
     * Update the dock (macOS) / taskbar (Windows) unread badge. Pass 0 to clear. Linux is a
     * silent no-op — X11/Wayland have no cross-DE badge primitive.
     */
    setUnreadCount?: (count: number) => void;
    /** Push the live presence to main (see DesktopPresence). */
    setPresence?: (presence: DesktopPresence) => void;
    /** The screen the user shares (null: none), so that the companion never opens by itself over it. */
    setScreenShareSource?: (source: DesktopScreenShareSource | null) => void;
    /**
     * Main asks this renderer to re-send its presence. Presence in the shell is a single global
     * describing the *active* tab, and it is cleared whenever the active tab changes; since the
     * renderer only pushes on change, without this the newly-active world's state would be missing
     * until something in it happened to change. Returns an unsubscriber.
     */
    onRequestPresence?: (callback: () => void) => () => void;
    /** Set the current world's display name on the active tab (admin-configured room name). */
    setTabTitle?: (title: string) => void;
    /**
     * Subscribe to system idle/active transitions (main polls powerMonitor + screen-lock events).
     * The renderer uses this to auto-set the WA availability to "away" and back. Returns an
     * unsubscriber.
     */
    onSystemIdle?: (callback: (idle: boolean) => void) => () => void;
    /**
     * Another tab entered a meeting: this world must turn off its microphone, camera and screen
     * share (one meeting at a time). Returns an unsubscriber.
     */
    onMediaPreempted?: (callback: () => void) => () => void;
    /** This world entered a meeting and media was turned off in another tab, named here. */
    onOtherMeetingMuted?: (callback: (worldName: string) => void) => () => void;
    onMuteToggle: (callback: () => void) => void;
    onCameraToggle: (callback: () => void) => void;
    /** Absent under Wayland, where the system share dialog is the picker (getDisplayMedia instead). */
    getDesktopCapturerSources?: (options: SourcesOptions) => Promise<DesktopCapturerSource[]>;
    /**
     * Open a big-numbered, click-to-share overlay on every physical display and resolve the screen
     * source the user clicks (null if they press Escape). Lets the user pick a screen by clicking it
     * directly instead of matching thumbnails in the picker. Screen sources only.
     */
    identifyScreens?: () => Promise<DesktopCapturerSource | null>;
    /**
     * Dismiss any open "identify screens" overlays. Safe to call when none are open (no-op). Used to
     * tear the overlays down if the picker unmounts mid-identify, since they're always-on-top over
     * every display with no other app-side exit.
     */
    cancelIdentifyScreens?: () => void;
    navigation?: WorkAdventureDesktopNavigationApi;
    windows?: WorkAdventureDesktopWindowsApi;
    /** macOS screen recording permission ("not-needed" elsewhere). */
    screenPermission?: WorkAdventureDesktopScreenPermissionApi;
    /** Start WorkAdventure when the user logs in to the computer (the "Desktop application" settings). */
    startAtLogin?: WorkAdventureDesktopStartAtLoginApi;
    /** Linux under Wayland only: run through XWayland or natively (the "Desktop application" settings). */
    windowMode?: WorkAdventureDesktopWindowModeApi;
};

/** Read from the system each time, so a change made in its own startup settings shows. */
export interface WorkAdventureDesktopStartAtLoginApi {
    get: () => Promise<boolean>;
    /** Resolves with the state the system ends up in. */
    set: (enabled: boolean) => Promise<boolean>;
}

/**
 * "x11" runs the app through XWayland: its floating windows (picture-in-picture, the presenter bar) can
 * be placed and kept on top, but global shortcuts only fire while it is in front. "wayland" runs it
 * natively: shortcuts work from any app, but the compositor places every window, in the middle.
 */
export type DesktopWindowMode = "x11" | "wayland";

export interface DesktopWindowModeState {
    /** The mode the next start uses. */
    saved: DesktopWindowMode;
    /** --ozone-platform on the command line decides instead: the choice has no effect. */
    setByCommandLine: boolean;
    /** XWayland is not running: compatibility mode cannot start. */
    x11Unavailable: boolean;
    /** This run does not use the saved mode yet: a restart applies it. */
    restartNeeded: boolean;
}

export interface WorkAdventureDesktopWindowModeApi {
    get: () => Promise<DesktopWindowModeState>;
    /** Saves the mode for the next start; resolves with the new state. */
    set: (mode: DesktopWindowMode) => Promise<DesktopWindowModeState>;
    /** Restarts the app, which then starts in the saved mode. */
    restart: () => void;
}
