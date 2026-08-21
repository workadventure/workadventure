import type { PostHog } from "@posthog/types";
import type {
    AnalyticsEventArgs,
    AnalyticsEventName,
    AnalyticsEventProperties,
    AnalyticsEventReportMessage,
} from "@workadventure/messages";
// By path rather than through the package barrel, and that is the point: this
// module's only import is a type, so what lands in the bundle is 117 strings. The
// same table used to live on the catalog entries, which pulled ~166 live Zod
// schemas into the browser to look one up.
import { POSTHOG_EVENT_KEYS } from "@workadventure/messages/src/JsonMessages/AnalyticsPostHogKeys";
import type { Emoji } from "../Stores/Utils/emojiSchema";
import { POSTHOG_API_KEY, POSTHOG_URL } from "../Enum/EnvironmentVariable";
import { hasCapability } from "../Connection/Capabilities";
import type { TimedAnalyticsEventHandle } from "./TimedAnalyticsEvent";
import { openTimedAnalyticsEvent } from "./TimedAnalyticsEvent";

type AdminAnalyticsSender = (message: AnalyticsEventReportMessage) => void;
type AdminAnalyticsEvent = AnalyticsEventReportMessage["events"][number];
export type MeetingProvider = "livekit" | "jitsi" | "webrtc";
type MeetingAnalyticsProperties = {
    meetingProvider: MeetingProvider;
    meetingId?: string;
    roomId?: string;
};
type CowebsiteMediaKind =
    | "pdf"
    | "image"
    | "video"
    | "audio"
    | "document"
    | "presentation"
    | "spreadsheet"
    | "website"
    | "other";
export type CowebsiteOpenedAnalyticsContext = {
    targetUrl?: string;
    mediaKind?: CowebsiteMediaKind;
    triggerProperty?: "openLink" | "openWebsite" | "other";
    fileName?: string;
    fileExtension?: string;
    areaId?: string;
    areaName?: string;
    schemaVersion?: number;
};
type ExperienceIssueProperties = {
    category?: string;
    reason?: string;
    durationMs?: number;
    count?: number;
};

const MAX_PENDING_ADMIN_EVENTS = 100;

declare global {
    interface Window {
        posthog?: PostHog;
    }
}

class AnalyticsClient {
    private isEnabled_ = false;
    private adminAnalyticsSender: AdminAnalyticsSender | undefined;
    private pendingAdminEvents: AdminAnalyticsEvent[] = [];
    /** Open intervals, by the thing they are measuring. Closing is by the same key. */
    private openAreas = new Map<string, TimedAnalyticsEventHandle>();
    /** A screen share and an availability status are each a single continuous state, so one handle, not a map. */
    private openScreenShare: TimedAnalyticsEventHandle | undefined;
    private openStatus: TimedAnalyticsEventHandle | undefined;
    private openMegaphoneBroadcast: TimedAnalyticsEventHandle | undefined;
    /**
     * Whether a broadcast is live, as opposed to whether we hold a handle for it.
     *
     * The two come apart across a reconnect: the handle is spent the moment the
     * socket dies — the pusher closes the interval itself as `socket_closed` — but
     * the broadcast is still running and nothing fires a second start. Without this,
     * a broadcast spanning a reconnect would stay invisible for the rest of the
     * tab's life; with it, setAdminAnalyticsSender reopens it against the new socket.
     */
    private megaphoneBroadcastLive = false;
    /** Open cowebsite visits, by cowebsite id: several can be open side by side. */
    private readonly openCowebsites = new Map<string, TimedAnalyticsEventHandle>();
    private currentStatus: string | undefined;
    private previousRoomId: string | undefined;

    constructor() {
        if ((POSTHOG_API_KEY || POSTHOG_URL) && (!POSTHOG_API_KEY || !POSTHOG_URL)) {
            console.warn("PostHog is partially configured. Analytics will not be sent.");
        }

        if (POSTHOG_API_KEY && POSTHOG_URL && !this.posthog) {
            console.warn("PostHog is configured but not initialized. Analytics will not be sent.");
        }

        this.isEnabled_ = POSTHOG_API_KEY != undefined && POSTHOG_URL != undefined;
    }

    private get posthog(): PostHog | undefined {
        return window.posthog;
    }

    public get posthogInstance(): PostHog | undefined {
        return window.posthog;
    }

    public get isEnabled(): boolean {
        return this.isEnabled_;
    }

    setAdminAnalyticsSender(sender: AdminAnalyticsSender | undefined): void {
        this.adminAnalyticsSender = sender;
        if (!sender) {
            // The connection is going away (ConnectionManager clears the sender on
            // cleanup). Every interval this socket still holds open is closed by the
            // pusher itself as socket_closed, so these handles are already spent:
            // keeping them would mean a later visit to the same area closes a handle
            // from a dead socket, which the pusher drops as unpaired.
            this.openAreas.clear();
            this.openScreenShare = undefined;
            this.openStatus = undefined;
            this.currentStatus = undefined;
            // The handle goes; `megaphoneBroadcastLive` deliberately does not.
            this.openMegaphoneBroadcast = undefined;
            this.openCowebsites.clear();
        } else if (this.megaphoneBroadcastLive) {
            this.openMegaphoneBroadcastInterval();
        }
        this.flushPendingAdminEvents();
    }

    /**
     * The single choke point every analytics event goes through — both sinks.
     *
     * Generic over the event name so the catalog checks both halves of the call:
     * an unknown name and a property the event does not declare are both compile
     * errors here, rather than an event the admin silently drops months later.
     * The properties argument is optional for the bare signals, which declare none.
     *
     * PostHog is fed from the same call, by looking the event up in
     * POSTHOG_EVENT_KEYS. Every method below used to name its event twice — once per
     * sink — which is 123 opportunities for the two names to drift; that map is now
     * the only place a PostHog name is written down.
     *
     * Except for the six events two UI paths reach under two PostHog names, which a
     * map keyed by event cannot express. Those are absent from POSTHOG_EVENT_KEYS and
     * capture PostHog themselves, on the line above their call to this — one line per
     * sink, where the two names are read together.
     */
    private trackAdminEvent<N extends AnalyticsEventName>(eventName: N, ...args: AnalyticsEventArgs<N>): void {
        const [properties = {}] = args;

        // Ahead of the capability gate, and deliberately: PostHog is the sink that
        // predates this pipeline, and on a world whose pusher does not advertise
        // api/analytics/events-batch it is the only one there is. Gating it on that
        // capability would switch analytics off for every such world.
        const postHogKey = POSTHOG_EVENT_KEYS[eventName];
        if (postHogKey) {
            this.posthog?.capture(postHogKey, properties);
        }

        if (!this.canSendAdminAnalytics()) {
            return;
        }

        const clientEventTimeMs = Date.now();
        const event = {
            eventName,
            source: "front",
            clientEventTimeMs,
            eventId: `${eventName}:${clientEventTimeMs}:${Math.random().toString(36).slice(2)}`,
            properties,
        } satisfies AdminAnalyticsEvent;

        this.dispatchAdminEvent(event);
    }

    private dispatchAdminEvent(event: AdminAnalyticsEvent): void {
        if (!this.adminAnalyticsSender) {
            this.pendingAdminEvents.push(event);
            if (this.pendingAdminEvents.length > MAX_PENDING_ADMIN_EVENTS) {
                this.pendingAdminEvents.shift();
            }
            return;
        }

        this.adminAnalyticsSender({ events: [event] });
    }

    /**
     * Routes a timed event's control frames through the same buffer as everything
     * else, rather than straight at the sender.
     *
     * The buffer is why: before the room connection exists there is nowhere to send,
     * and an interval opened then would otherwise vanish while its close still went
     * out — the pusher drops an unpaired close, so the interval would be lost with no
     * trace. Buffered, both frames arrive in order and the pusher pairs them.
     *
     * The pusher starts timing when the open *reaches* it, so a frame that waits in
     * this buffer shortens the interval it reports. Nothing here opens an interval
     * before the connection is up (you cannot stand in an area, or share a screen, in
     * a room you have not joined), so the wait is bounded by the flush that
     * setAdminAnalyticsSender triggers. If the buffer overflows and drops an open,
     * the pusher drops the close too: a lost interval, never an invented one.
     */
    private readonly sendTimedEventReport = (message: AnalyticsEventReportMessage): void => {
        for (const event of message.events ?? []) {
            this.dispatchAdminEvent(event);
        }
    };

    private canSendAdminAnalytics(): boolean {
        return "capabilities" in window && hasCapability("api/analytics/events-batch") === "v1";
    }

    private flushPendingAdminEvents(): void {
        if (!this.adminAnalyticsSender || this.pendingAdminEvents.length === 0) {
            return;
        }

        const events = this.pendingAdminEvents;
        this.pendingAdminEvents = [];
        this.adminAnalyticsSender({ events });
    }

    identifyUser(uuid: string, email: string | null, roomId: string | null): void {
        this.posthog?.identify(uuid, { uuid, email, wa: true, roomId });
        this.trackAdminEvent("auth.user_identified", { roomId });
    }

    loggedWithSso(): void {
        this.trackAdminEvent("auth.logged_sso");
    }

    loggedWithToken(): void {
        this.trackAdminEvent("auth.logged_token");
    }

    enteredRoom(roomId: string, roomGroup: string | null): void {
        this.trackAdminEvent("room.visited", { roomId, roomGroup });
        if (this.previousRoomId && this.previousRoomId !== roomId) {
            this.trackAdminEvent("room.changed", { fromRoomId: this.previousRoomId, toRoomId: roomId });
        }
        this.previousRoomId = roomId;
    }

    openedMenu(): void {
        this.trackAdminEvent("menu.opened");
    }

    launchEmote(emote: Emoji): void {
        this.trackAdminEvent("emote.launched", { name: emote.name });
    }

    editEmote(): void {
        this.trackAdminEvent("emote.edit_opened");
    }

    clickOnCustomButton(id: string, label?: string, toolTip?: string, imageSrc?: string) {
        this.trackAdminEvent("custom_button.clicked", { id, label });
    }

    enteredJitsi(roomName: string, roomId: string): void {
        this.posthog?.capture("wa-entered-jitsi", { roomId, meetingProvider: "jitsi" });
        this.trackAdminEvent("meeting.area_entered", { roomId, meetingProvider: "jitsi" });
    }

    enteredMeetingRoom(roomName: string, roomId: string): void {
        this.posthog?.capture("wa-entered-meeting-room", { roomId });
        this.trackAdminEvent("meeting.area_entered", { roomId });
    }

    validationName(): void {
        this.trackAdminEvent("onboarding.name_validated");
    }

    validationWoka(scene: string): void {
        this.trackAdminEvent("onboarding.woka_validated", { scene });
    }

    validationVideo(): void {
        this.trackAdminEvent("onboarding.video_validated");
    }

    /** New feature analytics **/
    openedChat(): void {
        this.trackAdminEvent("chat.opened");
    }

    chatMessageSent(chatContext?: "proximity" | "room"): void {
        this.trackAdminEvent("chat.message_sent", { chatContext });
    }

    openInvite(): void {
        this.trackAdminEvent("invite.opened");
    }

    inviteSent(inviteType?: string): void {
        this.trackAdminEvent("invite.sent", { inviteType });
    }

    inviteAccepted(inviteType?: string): void {
        this.trackAdminEvent("invite.accepted", { inviteType });
    }

    lockDiscussion(): void {
        this.trackAdminEvent("bubble.lock.toggled");
    }

    lockArea(areaId: string, areaName: string | undefined, locked: boolean): void {
        this.trackAdminEvent("map_editor.area.lock.toggled", { areaId, areaName, locked });
    }

    screenSharing(): void {
        this.trackAdminEvent("meeting.screenshare.toggled");
    }

    screenSharingStarted(hasAudio: boolean): void {
        if (!this.canSendAdminAnalytics()) {
            return;
        }

        // A live handle here means the matching stop never arrived, so this
        // interval's END is the arrival of the next one rather than a real stop.
        // The client no longer states why it closed, so that is not distinguishable
        // downstream — see the note on TIMED_EVENT_END_REASONS.
        this.openScreenShare?.close();
        this.openScreenShare = openTimedAnalyticsEvent(
            "meeting.screenshare.ended",
            { hasAudio },
            this.sendTimedEventReport,
        );
    }

    screenSharingEnded(): void {
        this.openScreenShare?.close();
        this.openScreenShare = undefined;
    }

    follow(): void {
        this.trackAdminEvent("user.follow_requested");
    }

    camera(): void {
        this.trackAdminEvent("media.camera.toggled");
    }

    microphone(): void {
        this.trackAdminEvent("media.microphone.toggled");
    }

    retryConnectionWebRtc(): void {
        this.posthog?.capture("wa_retry_connection_webrtc", { meetingProvider: "webrtc" });
        this.trackAdminEvent("media.connection_retry", { meetingProvider: "webrtc" });
    }

    retryConnectionLivekit(): void {
        this.posthog?.capture("wa_retry_connection_livekit", { meetingProvider: "livekit" });
        this.trackAdminEvent("media.connection_retry", { meetingProvider: "livekit" });
    }

    openBackgroundSettings(): void {
        this.trackAdminEvent("settings.background.opened");
    }

    selectCamera(): void {
        this.trackAdminEvent("settings.camera.selected");
    }

    selectMicrophone(): void {
        this.trackAdminEvent("settings.microphone.selected");
    }

    selectSpeaker(): void {
        this.trackAdminEvent("settings.speaker.selected");
    }

    settingMicrophone(value: string): void {
        this.trackAdminEvent("settings.microphone.changed", { value });
    }

    settingBackground(background: string): void {
        this.trackAdminEvent("settings.background.changed", { backgroundType: background });
    }

    settingCamera(value: string): void {
        this.trackAdminEvent("settings.camera.changed", { value });
    }

    settingNotification(value: string): void {
        this.trackAdminEvent("settings.notification.changed", { value });
    }

    settingPictureInPicture(value: string): void {
        this.trackAdminEvent("settings.picture_in_picture.changed", { value });
    }

    settingFullscreen(value: string): void {
        this.trackAdminEvent("settings.fullscreen.changed", { value });
    }

    settingAskWebsite(value: string): void {
        this.trackAdminEvent("settings.ask_website.changed", { value });
    }

    settingRequestFollow(value: string): void {
        this.trackAdminEvent("settings.request_follow.changed", { value });
    }

    settingDecreaseAudioVolume(value: string): void {
        this.trackAdminEvent("settings.decrease_audio_volume.changed", { value });
    }

    login(): void {
        this.trackAdminEvent("auth.login_clicked");
    }

    logout(): void {
        this.trackAdminEvent("auth.logout_clicked");
    }

    /**
     * Opens the interval that measures one cowebsite visit.
     *
     * Keyed by the cowebsite's id, because several can be open side by side and each
     * closes on its own — unlike a screen share or a broadcast, this map earns itself.
     */
    openedWebsite(coWebsiteId: string, url: URL, context: CowebsiteOpenedAnalyticsContext = {}): void {
        // Captured here rather than off a catalog postHogKey: what this opens is an
        // interval, reported to the admin only when the cowebsite CLOSES, whereas
        // PostHog has always counted the opening. The two sinks are measuring
        // different things, so there is no one event to hang both on.
        //
        // Origin only before it reaches PostHog too: cowebsite URLs carry auth tokens
        // in the query/hash and the document name in the path. The admin sink does the
        // same via buildCowebsiteOpenedProperties; keep both in sync.
        this.posthog?.capture("wa_opened_website", { url: this.stripUrlToOrigin(url) });
        if (!this.canSendAdminAnalytics()) {
            return;
        }

        // A live handle for this id means the close never arrived; end that visit here
        // rather than stranding it until the socket dies.
        this.openCowebsites.get(coWebsiteId)?.close();
        this.openCowebsites.set(
            coWebsiteId,
            openTimedAnalyticsEvent(
                "cowebsite.closed",
                this.buildCowebsiteOpenedProperties(url, context),
                this.sendTimedEventReport,
            ),
        );
    }

    closedWebsite(coWebsiteId: string): void {
        this.openCowebsites.get(coWebsiteId)?.close();
        this.openCowebsites.delete(coWebsiteId);
    }

    /**
     * A URL the scripting API put on screen somewhere the app does not own: a browser
     * tab, a navigation away, a UI panel, an in-map iframe. None of them is a
     * cowebsite, and all five used to report `cowebsite.opened` with no context —
     * landing as triggerProperty `other` and diluting every per-area cowebsite figure.
     * PostHog keeps seeing them under the same name it always has.
     */
    scriptingWebsiteOpened(url: URL): void {
        this.trackAdminEvent("scripting.website_opened", { url: this.stripUrlToOrigin(url) });
    }

    menuCredit(): void {
        this.trackAdminEvent("menu.credit.opened");
    }

    menuProfile(): void {
        this.posthog?.capture("wa_menu_profile");
        this.trackAdminEvent("profile.opened");
    }

    menuSetting() {
        this.trackAdminEvent("settings.opened");
    }

    menuChat(): void {
        this.trackAdminEvent("menu.chat.opened");
    }

    menuCustom(name: string): void {
        this.trackAdminEvent("menu.custom.opened", { name });
    }

    menuShortcuts(): void {
        this.trackAdminEvent("menu.shortcuts.opened");
    }

    globalMessage(): void {
        this.posthog?.capture("wa_menu_globalmessage");
        this.trackAdminEvent("global_message.opened");
    }

    sendGlocalTextMessage(): void {
        this.trackAdminEvent("global_message.text_sent");
    }

    sendGlobalSoundMessage(): void {
        this.trackAdminEvent("global_message.sound_sent");
    }

    reportIssue(): void {
        this.posthog?.capture("wa_menu_report", { feedbackSource: "external_report_url" });
        this.trackAdminEvent("feedback.opened", { feedbackSource: "external_report_url" });
    }

    feedbackOpened(feedbackSource: "sentry" | "external_report_url" = "sentry"): void {
        this.trackAdminEvent("feedback.opened", { feedbackSource });
    }

    feedbackSubmitted(feedbackSource: "sentry" | "external_report_url" = "sentry", hasScreenshot?: boolean): void {
        this.trackAdminEvent("feedback.submitted", { feedbackSource, hasScreenshot });
    }

    menuContact(): void {
        this.trackAdminEvent("menu.contact.opened");
    }

    inviteCopyLink(): void {
        this.posthog?.capture("wa_menu_invite_copylink", { inviteType: "copy_link" });
        this.trackAdminEvent("invite.sent", { inviteType: "copy_link" });
    }

    inviteCopyLinkWalk(value: boolean): void {
        this.trackAdminEvent("invite.walk_link_option_changed", { value });
    }

    editCompanion(): void {
        this.trackAdminEvent("profile.companion_edit_opened");
    }

    editCamera(): void {
        this.trackAdminEvent("profile.camera_edit_opened");
    }

    editName(): void {
        this.trackAdminEvent("profile.name_edit_opened");
    }

    editWoka(): void {
        this.trackAdminEvent("profile.woka_edit_opened");
    }

    goToPersonalDesk(): void {
        this.trackAdminEvent("personal_desk.entered");
    }

    unclaimPersonalDesk(): void {
        this.trackAdminEvent("personal_desk.unclaimed");
    }

    selectWoka(): void {
        this.trackAdminEvent("onboarding.woka_selected");
    }

    selectCompanion(): void {
        this.trackAdminEvent("onboarding.companion_selected");
    }

    selectCustomWoka(): void {
        this.trackAdminEvent("onboarding.custom_woka_selected");
    }

    layoutPresentChange(): void {
        this.trackAdminEvent("meeting.layout_changed", { layout: "presentation" });
    }

    addNewParticipant(peerId: string, userId: string, uuid: string): void {
        this.trackAdminEvent("conversation.participant_added");
    }

    openMegaphone(): void {
        this.trackAdminEvent("megaphone.opened");
    }

    // The two ends of one interval, opened and closed where the broadcast is started
    // and stopped — startMegaphoneLive / stopMegaphoneLive. Everything that ends a
    // broadcast goes through the second one, including being kicked off the stage.
    //
    // Both keep their own posthog.capture: PostHog counts the two ends as two events,
    // while the admin gets one `megaphone.ended` row carrying the duration.
    startMegaphone(): void {
        this.posthog?.capture("wa_start_megaphone");
        this.megaphoneBroadcastLive = true;
        this.openMegaphoneBroadcastInterval();
    }

    stopMegaphone(): void {
        this.posthog?.capture("wa_stop_megaphone");
        this.megaphoneBroadcastLive = false;
        this.openMegaphoneBroadcast?.close();
        this.openMegaphoneBroadcast = undefined;
    }

    private openMegaphoneBroadcastInterval(): void {
        // startMegaphoneLive is reachable twice without an intervening stop — the modal
        // and the action bar both reach it. Reopening would restart the clock and lose
        // the time already broadcast.
        if (this.openMegaphoneBroadcast || !this.canSendAdminAnalytics()) {
            return;
        }

        this.openMegaphoneBroadcast = openTimedAnalyticsEvent("megaphone.ended", {}, this.sendTimedEventReport);
    }

    toggleMapEditor(open: boolean): void {
        this.trackAdminEvent(open ? "map_editor.opened" : "map_editor.closed");
    }

    addMapEditorProperty(type: string, propertyName: string): void {
        // 8 decembre 2023: this event is not used anymore
        // this.posthog?.capture(`wa_map-editor_${type}_add_${propertyName}_property`);
        this.trackAdminEvent("map_editor.property.added", { name: propertyName, type });
    }

    removeMapEditorProperty(type: string, propertyName: string): void {
        // 8 decembre 2023: this event is not used anymore
        // this.posthog?.capture(`wa_map-editor_${type}_remove_${propertyName}_property`);
        this.trackAdminEvent("map_editor.property.removed", { name: propertyName, type });
    }

    openMapEditorTool(toolName: string): void {
        // 8 decembre 2023: this event is not used anymore
        // this.posthog?.capture(`wa_map-editor_open_${toolName}`);
        this.trackAdminEvent("map_editor.tool.opened", { name: toolName });
    }

    clickPropertyMapEditor(name: string, style?: string): void {
        this.trackAdminEvent("map_editor.property.clicked", { name, style });
    }

    // enterArea/leaveArea keep their own posthog.capture for the same reason megaphone
    // does: PostHog counts an enter and a leave, the admin gets one `area.dwell` row.
    enterArea(id: string, name: string): void {
        this.posthog?.capture(`wa_map-editor_enter_area`, { id, name });
        if (!this.canSendAdminAnalytics()) {
            return;
        }

        // Entering an area already open means the previous leave never arrived.
        // Close it rather than orphan it: the map holds one handle per area, so
        // overwriting would leave an interval nothing could ever close, and the
        // pusher would only close it when the socket died — dating a walk-through
        // to the end of the session.
        this.openAreas.get(id)?.close();
        this.openAreas.set(
            id,
            openTimedAnalyticsEvent("area.dwell", { areaId: id, areaName: name }, this.sendTimedEventReport),
        );
    }

    leaveArea(id: string, name: string): void {
        this.posthog?.capture(`wa_map-editor_leaver_area`, { id, name });
        this.openAreas.get(id)?.close();
        this.openAreas.delete(id);
    }

    // Availability status (Online/Busy/Do-not-disturb/…) as a timed event: one row
    // per period, measured by the pusher. Like a conversation, the current period
    // stays open until the status changes or the socket dies (the pusher closes the
    // last one). A flip faster than 1s is dropped as churn. A reconnect leaves the
    // status untracked until the next change — the same gap the old status.changed
    // pairing had, since it only fired on a change too.
    statusChanged(status: string): void {
        if (!this.canSendAdminAnalytics() || status === this.currentStatus) {
            return;
        }

        this.currentStatus = status;
        this.openStatus?.close();
        this.openStatus = openTimedAnalyticsEvent("status.dwell", { status }, this.sendTimedEventReport);
    }

    enterAreaMapEditor(id: string, name: string): void {
        this.enterArea(id, name);
    }

    leaveAreaMapEditor(id: string, name: string): void {
        this.leaveArea(id, name);
    }

    turnTestSuccess(protocol: string | null): void {
        this.trackAdminEvent("media.turn_test.succeeded", { protocol });
    }

    turnTestFailure(): void {
        this.trackAdminEvent("media.turn_test.failed");
    }
    turnTestTimeout(): void {
        this.trackAdminEvent("media.turn_test.timeout");
    }

    noVideoStreamReceived(): void {
        this.trackAdminEvent("media.video_stream_missing");
    }

    moreActionMetting(): void {
        this.trackAdminEvent("meeting.actions.opened");
    }

    pinMeetingAction(): void {
        this.trackAdminEvent("meeting.participant.pinned");
    }

    muteMicrophoneMeetingAction(): void {
        this.trackAdminEvent("meeting.microphone.muted");
    }

    muteMicrophoneEverybodyMeetingAction(): void {
        this.trackAdminEvent("meeting.microphone.muted_for_everybody");
    }

    muteVideoMeetingAction(): void {
        this.trackAdminEvent("meeting.video.muted");
    }
    muteVideoEverybodyMeetingAction(): void {
        this.trackAdminEvent("meeting.video.muted_for_everybody");
    }

    kickoffMeetingAction(): void {
        this.trackAdminEvent("meeting.participant.kicked");
    }

    sendPrivateMessageMeetingAction(): void {
        this.trackAdminEvent("meeting.private_message.clicked");
    }

    reportMeetingAction(): void {
        this.trackAdminEvent("meeting.report.clicked");
    }

    openExplorationMode(): void {
        this.trackAdminEvent("map_explorer.opened");
    }

    closeExplorationMode(): void {
        this.trackAdminEvent("map_explorer.closed");
    }

    openedRoomList(): void {
        this.trackAdminEvent("room_list.opened");
    }

    clickedRoomListRoom(roomId?: string): void {
        this.trackAdminEvent("room_list.room_clicked", { roomId });
    }

    openedPopup(targetRectangle: string, id: number): void {
        this.trackAdminEvent("popup.opened", { targetRectangle, id });
    }

    openGlobalMessage(): void {
        this.posthog?.capture("wa_action_globalmessage");
        this.trackAdminEvent("global_message.opened");
    }

    openGlobalAudio(): void {
        this.trackAdminEvent("global_audio.opened");
    }

    openExternalModuleCalendar(): void {
        this.trackAdminEvent("external_module.calendar_opened");
    }

    openExternalModuleTodoList(): void {
        this.trackAdminEvent("external_module.todo_list_opened");
    }

    openExternalModule(): void {
        this.trackAdminEvent("external_module.opened");
    }

    settingAudioVolume(): void {
        this.trackAdminEvent("settings.audio_volume.opened");
    }

    openPicker(applicationName: string): void {
        this.trackAdminEvent("map_editor.application_picker.opened", { applicationName });
    }

    openApplicationWithoutPicker(applicationName: string): void {
        this.trackAdminEvent("map_editor.application.opened", { applicationName });
    }

    openCowebsiteInNewTab(): void {
        this.trackAdminEvent("cowebsite.opened_in_new_tab");
    }
    copyCowebsiteLink(): void {
        this.trackAdminEvent("cowebsite.link_copied");
    }
    // PostHog only. `cowebsite.closed` is now the end of an interval the store opens
    // and closes, so reporting it from the close BUTTON would both duplicate it and
    // miss the fifteen other ways a cowebsite goes away.
    closeCowebsite(): void {
        this.posthog?.capture("wa_close_cowebsite");
    }
    fullScreenCowebsite(): void {
        this.trackAdminEvent("cowebsite.fullscreen_opened");
    }
    switchCowebsite(): void {
        this.trackAdminEvent("cowebsite.switched");
    }
    openProfileMenu(): void {
        this.posthog?.capture("wa_open_profile_menu");
        this.trackAdminEvent("profile.opened");
    }
    filterInMapExplorer(): void {
        this.trackAdminEvent("map_explorer.filtered");
    }
    resizeCameraLayout(): void {
        this.trackAdminEvent("meeting.camera_layout_resized");
    }
    openUserList(): void {
        this.trackAdminEvent("user_list.opened");
    }
    openMessageList(): void {
        this.trackAdminEvent("chat.message_list_opened");
    }

    sendMessageFromUserList(): void {
        this.trackAdminEvent("chat.message_from_user_list_clicked");
    }
    createMatrixRoom(): void {
        this.trackAdminEvent("chat.matrix_room.created");
    }
    createMatrixFolder(): void {
        this.trackAdminEvent("chat.matrix_folder.created");
    }
    startMatrixEncryptionConfiguration(): void {
        this.trackAdminEvent("chat.matrix_encryption_configuration.started");
    }
    externalModuleChatBandClick(externalModuleName: string, action: string): void {
        this.trackAdminEvent("external_module.chat_band.clicked", { externalModuleName, action });
    }
    dragDropFile() {
        this.trackAdminEvent("file.drag_dropped");
    }

    /**
     * Opens a meeting and hands back the only way to close it.
     *
     * The handle goes to the caller rather than into a map here, because the two
     * callers have different lifetimes: Jitsi is a single global state, while a
     * SpacePeerManager belongs to one space and several can be live at once. A
     * handle whose socket has gone away is spent — the pusher closes the interval
     * itself as `socket_closed` — so a late close is dropped as unpaired rather
     * than reported twice.
     */
    openMeeting(properties: MeetingAnalyticsProperties): TimedAnalyticsEventHandle | undefined {
        if (!this.canSendAdminAnalytics()) {
            return undefined;
        }

        return openTimedAnalyticsEvent("meeting.ended", properties, this.sendTimedEventReport);
    }

    sessionStarted(roomId?: string): void {
        this.trackAdminEvent("session.started", { roomId, schemaVersion: 1 });
    }

    sessionEnded(roomId?: string): void {
        this.trackAdminEvent("session.ended", { roomId, schemaVersion: 1 });
    }

    mapEditorSaveFailed(reason?: string): void {
        this.trackAdminEvent("map_editor.save.failed", { reason });
    }

    mapEditorEntityAdded(entityType?: string): void {
        this.trackAdminEvent("map_editor.entity.added", { entityType });
    }

    mapEditorEntityRemoved(entityType?: string): void {
        this.trackAdminEvent("map_editor.entity.removed", { entityType });
    }

    mapEditorEntityUpdated(entityType?: string): void {
        this.trackAdminEvent("map_editor.entity.updated", { entityType });
    }

    mapEditorAreaCreated(areaType?: string): void {
        this.trackAdminEvent("map_editor.area.created", { areaType });
    }

    mapEditorAreaUpdated(areaType?: string): void {
        this.trackAdminEvent("map_editor.area.updated", { areaType });
    }

    mapEditorAreaRemoved(areaType?: string): void {
        this.trackAdminEvent("map_editor.area.removed", { areaType });
    }

    mapLoadingStarted(mapUrl?: string): void {
        // Strip query string / fragment so map/WAM/room URLs carrying access
        // tokens are not shipped as analytics, mirroring the cowebsite URL handling.
        this.trackAdminEvent("map_loading.started", {
            mapUrl: mapUrl ? this.stripUrlSensitiveParts(mapUrl) : undefined,
        });
    }

    mapLoadingSucceeded(durationMs?: number): void {
        this.trackAdminEvent("map_loading.succeeded", { durationMs });
    }

    mapLoadingFailed(reason?: string, durationMs?: number): void {
        this.trackAdminEvent("map_loading.failed", { reason, durationMs });
    }

    worldEntered(durationMs?: number): void {
        this.trackAdminEvent("world.entered", { durationMs });
    }

    tileOrAssetError(kind: "tile" | "asset", reason?: string): void {
        this.trackAdminEvent("asset.error", { kind, reason });
    }

    websocketReconnecting(): void {
        this.trackAdminEvent("websocket.reconnecting");
    }

    websocketConnectionLost(reason?: string): void {
        this.trackAdminEvent("websocket.connection_lost", { reason });
    }

    mediaPermissionDenied(kind: "camera" | "microphone" | "camera_microphone", reason?: string): void {
        this.trackAdminEvent("media.permission_denied", { kind, reason });
    }

    mediaDeviceError(kind: "camera" | "microphone" | "camera_microphone", reason?: string): void {
        this.trackAdminEvent("media.device_error", { kind, reason });
    }

    mediaQualityIssue(properties: ExperienceIssueProperties = {}): void {
        this.trackAdminEvent("media.quality_issue", properties);
    }

    frontCriticalError(properties: ExperienceIssueProperties = {}): void {
        this.trackAdminEvent("front.critical_error", properties);
    }

    performanceIssue(properties: ExperienceIssueProperties = {}): void {
        this.trackAdminEvent("performance.issue", properties);
    }

    private buildCowebsiteOpenedProperties(
        url: URL,
        context: CowebsiteOpenedAnalyticsContext,
    ): AnalyticsEventProperties<"cowebsite.opened"> {
        const rawTargetUrl = context.targetUrl ?? url.toString();
        const fileExtension = this.normalizeFileExtension(
            context.fileExtension ?? this.getFileExtensionFromUrl(rawTargetUrl),
        );
        const mediaKind = context.mediaKind ?? this.inferCowebsiteMediaKind(rawTargetUrl, fileExtension);

        return {
            // Origin only. The query and hash carry auth tokens (access_token, sas,
            // signed URLs) and the rest of the path carries whatever else the URL
            // encodes, none of which analytics needs — the document name is reported
            // on its own below, so the path would only be a second, unfiltered copy.
            url: this.stripUrlToOrigin(url),
            targetUrl: this.stripUrlToOrigin(rawTargetUrl),
            mediaKind,
            triggerProperty: context.triggerProperty ?? "other",
            // Which documents a world opens is a metric its own administrator asks
            // for, so the name is reported as its own field rather than smuggled
            // inside a URL. It is deliberately absent from the admin's anonymization
            // allowlist: document names are frequently sensitive (NDA-acme.pdf,
            // salary-2026.xlsx), so a world that opts out of user-level activity has
            // them stripped at ingestion, and the internal Kiosk does not project the
            // column at all — only the world's own back-office shows it.
            fileName: context.fileName ?? this.getFileNameFromUrl(rawTargetUrl),
            fileExtension,
            areaId: context.areaId,
            areaName: context.areaName,
            schemaVersion: context.schemaVersion ?? 1,
        };
    }

    /**
     * Drops the query string and hash, which routinely carry auth tokens
     * (access_token, sas, signed URLs). The path is kept on purpose: for a map
     * URL it *is* the analytic signal — it names which map was loaded, and every
     * map would otherwise collapse onto its host.
     *
     * Not suitable for URLs the user chose: use stripUrlToOrigin for those.
     */
    private stripUrlSensitiveParts(input: string | URL): string {
        try {
            const parsed = input instanceof URL ? input : new URL(input, window.location.origin);
            return parsed.origin + parsed.pathname;
        } catch {
            return typeof input === "string" ? input.split("?")[0].split("#")[0] : input.toString();
        }
    }

    /**
     * Reduces a user-chosen URL (an opened cowebsite) to its origin.
     *
     * The path is dropped as well as the query and hash, because it ends in the
     * document name — keeping it re-introduced exactly the filenames this class
     * refuses to collect (see buildCowebsiteOpenedProperties). getFileNameFromUrl
     * below derives the name from nothing but that path, and the admin ran the
     * very same extraction on the URL we shipped, so stripping fileName alone
     * achieved nothing. The origin answers the analytic question — which apps do
     * worlds open — without naming the document.
     */
    private stripUrlToOrigin(input: string | URL): string {
        try {
            const parsed = input instanceof URL ? input : new URL(input, window.location.origin);
            return parsed.origin;
        } catch {
            // Unparseable: return the scheme+host prefix rather than the raw
            // string, which would leak the path we just refused to send.
            const asString = typeof input === "string" ? input : input.toString();
            const schemeMatch = asString
                .split("?")[0]
                .split("#")[0]
                .match(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i);
            return schemeMatch ? schemeMatch[0] : "";
        }
    }

    private getFileNameFromUrl(targetUrl: string): string | null {
        try {
            const pathname = new URL(targetUrl, window.location.origin).pathname;
            const segments = pathname.split("/").filter(Boolean);
            if (segments.length === 0) {
                return null;
            }

            return decodeURIComponent(segments[segments.length - 1] ?? "") || null;
        } catch (error) {
            console.debug("Unable to extract cowebsite file name", error);
            return null;
        }
    }

    private getFileExtensionFromUrl(targetUrl: string): string | null {
        const fileName = this.getFileNameFromUrl(targetUrl);
        if (!fileName || !fileName.includes(".")) {
            return null;
        }

        return this.normalizeFileExtension(fileName.split(".").pop() ?? null);
    }

    private normalizeFileExtension(extension: string | null | undefined): string | null {
        if (!extension) {
            return null;
        }

        return extension.trim().replace(/^\./, "").toLowerCase() || null;
    }

    private inferCowebsiteMediaKind(targetUrl: string, fileExtension: string | null): CowebsiteMediaKind {
        if (!fileExtension) {
            return this.looksLikeWebsiteUrl(targetUrl) ? "website" : "other";
        }

        if (fileExtension === "pdf") {
            return "pdf";
        }

        if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"].includes(fileExtension)) {
            return "image";
        }

        if (["mp4", "webm", "mov", "avi", "mkv", "ogv"].includes(fileExtension)) {
            return "video";
        }

        if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(fileExtension)) {
            return "audio";
        }

        if (["ppt", "pptx", "odp", "key"].includes(fileExtension)) {
            return "presentation";
        }

        if (["xls", "xlsx", "ods", "csv", "tsv"].includes(fileExtension)) {
            return "spreadsheet";
        }

        if (["doc", "docx", "odt", "rtf", "txt", "md"].includes(fileExtension)) {
            return "document";
        }

        if (["html", "htm"].includes(fileExtension)) {
            return "website";
        }

        return "other";
    }

    private looksLikeWebsiteUrl(targetUrl: string): boolean {
        try {
            const parsedUrl = new URL(targetUrl, window.location.origin);
            return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
        } catch (error) {
            console.debug("Unable to classify cowebsite URL", error);
            return false;
        }
    }
    openSayBubble(): void {
        this.trackAdminEvent("bubble.say.opened");
    }
    openThinkBubble(): void {
        this.trackAdminEvent("bubble.think.opened");
    }
    clickTopOpenMapExplorer(): void {
        this.trackAdminEvent("map_explorer.top_button_clicked");
    }
    clickCenterToUser(): void {
        this.trackAdminEvent("map_explorer.center_to_user_clicked");
    }
    clickToZoomIn(): void {
        this.trackAdminEvent("map_explorer.zoom_in_clicked");
    }
    clickToZoomOut(): void {
        this.trackAdminEvent("map_explorer.zoom_out_clicked");
    }
    clickPictureInPicture(open: boolean): void {
        this.trackAdminEvent("meeting.picture_in_picture.toggled", { open });
    }
    goToUser(): void {
        this.trackAdminEvent("user.go_to_clicked");
    }
    showBusinessCard(): void {
        this.trackAdminEvent("user.business_card.opened");
    }
    reportUser(): void {
        this.trackAdminEvent("user.report.clicked");
    }
    openWokaMenu(): void {
        this.trackAdminEvent("user.woka_menu.opened");
    }

    recordingStart(): void {
        this.trackAdminEvent("recording.started");
    }

    recordingStop(): void {
        this.trackAdminEvent("recording.stopped");
    }

    openedRecordingList(): void {
        this.trackAdminEvent("recording.list_opened");
    }

    /** Web app install prompt analytics */
    pwaInstallPromptShown(isIos: boolean): void {
        this.trackAdminEvent("pwa.install_prompt_shown", { isIos });
    }

    pwaInstallClick(): void {
        this.trackAdminEvent("pwa.install_clicked");
    }

    pwaContinueInBrowserClick(): void {
        this.trackAdminEvent("pwa.continue_in_browser_clicked");
    }

    pwaInstallOutcome(outcome: "accepted" | "dismissed"): void {
        this.trackAdminEvent("pwa.install_outcome", { outcome });
    }
    pwaInstallFromProfileMenuClick(): void {
        this.trackAdminEvent("pwa.install_from_profile_menu_clicked");
    }
    // PostHog only: the pusher owns socket lifecycle in the new pipeline (user.connected
    // / user.disconnected), so there is no front-side event for these to report.
    socketReconnecting(): void {
        this.posthog?.capture("wa_socket_reconnecting");
    }
    socketReconnected(): void {
        this.posthog?.capture("wa_socket_reconnected");
    }
}
export const analyticsClient = new AnalyticsClient();
