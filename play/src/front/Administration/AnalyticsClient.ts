import type { PostHog } from "@posthog/types";
import type { AnalyticsEventReportMessage } from "@workadventure/messages";
import type { Emoji } from "../Stores/Utils/emojiSchema";
import { POSTHOG_API_KEY, POSTHOG_URL } from "../Enum/EnvironmentVariable";
import { hasCapability } from "../Connection/Capabilities";
import type { TimedAnalyticsEventHandle } from "./TimedAnalyticsEvent";
import { openTimedAnalyticsEvent } from "./TimedAnalyticsEvent";

type AdminAnalyticsProperties = Record<string, string | number | boolean | null | undefined>;
type AdminAnalyticsSender = (message: AnalyticsEventReportMessage) => void;
type AdminAnalyticsEvent = AnalyticsEventReportMessage["events"][number];
type MeetingAnalyticsProperties = {
    meetingId?: string;
    roomId?: string;
    meetingProvider?: "livekit" | "jitsi" | "webrtc";
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
type CowebsiteOpenedAnalyticsContext = {
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

const ANALYTICS_EVENTS_CAPABILITY = "api/analytics/events-batch";
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
    private openScreenShares = new Map<string, TimedAnalyticsEventHandle>();
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
            this.openScreenShares.clear();
        }
        this.flushPendingAdminEvents();
    }

    private trackAdminEvent(eventName: string, properties: AdminAnalyticsProperties = {}): void {
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
        return "capabilities" in window && hasCapability(ANALYTICS_EVENTS_CAPABILITY) === "v1";
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
        this.posthog?.capture("wa-logged-sso");
        this.trackAdminEvent("auth.logged_sso");
    }

    loggedWithToken(): void {
        this.posthog?.capture("wa-logged-token");
        this.trackAdminEvent("auth.logged_token");
    }

    enteredRoom(roomId: string, roomGroup: string | null): void {
        this.posthog?.capture("$pageView", { roomId, roomGroup });
        this.posthog?.capture("enteredRoom");
        this.trackAdminEvent("room.visited", { roomId, roomGroup });
        if (this.previousRoomId && this.previousRoomId !== roomId) {
            this.trackAdminEvent("room.changed", { fromRoomId: this.previousRoomId, toRoomId: roomId });
        }
        this.previousRoomId = roomId;
    }

    openedMenu(): void {
        this.posthog?.capture("wa-opened-menu");
        this.trackAdminEvent("menu.opened");
    }

    launchEmote(emote: Emoji): void {
        this.posthog?.capture("wa-emote-launch", { ...emote });
        this.trackAdminEvent("emote.launched", { name: emote.name });
    }

    editEmote(): void {
        this.posthog?.capture("wa-emote-edit");
        this.trackAdminEvent("emote.edit_opened");
    }

    clickOnCustomButton(id: string, label?: string, toolTip?: string, imageSrc?: string) {
        this.posthog?.capture("wa-custom-button", { id, label, toolTip, imageSrc });
        this.trackAdminEvent("custom_button.clicked", { id, label });
    }

    enteredJitsi(roomName: string, roomId: string): void {
        this.posthog?.capture("wa-entered-jitsi", { roomName, roomId });
        this.trackAdminEvent("meeting.area_entered", { roomId, meetingProvider: "jitsi" });
    }

    enteredMeetingRoom(roomName: string, roomId: string): void {
        this.posthog?.capture("wa-entered-meeting-room", { roomName, roomId });
        this.trackAdminEvent("meeting.area_entered", { roomId });
    }

    validationName(): void {
        this.posthog?.capture("wa-name-validation");
        this.trackAdminEvent("onboarding.name_validated");
    }

    validationWoka(scene: string): void {
        this.posthog?.capture("wa-woka-validation", { scene });
        this.trackAdminEvent("onboarding.woka_validated", { scene });
    }

    validationVideo(): void {
        this.posthog?.capture("wa-video-validation");
        this.trackAdminEvent("onboarding.video_validated");
    }

    /** New feature analytics **/
    openedChat(): void {
        this.posthog?.capture("wa-opened-chat");
        this.trackAdminEvent("chat.opened");
    }

    chatMessageSent(chatContext?: "proximity" | "room"): void {
        this.trackAdminEvent("chat.message_sent", { chatContext });
    }

    openInvite(): void {
        this.posthog?.capture("wa-opened-invite");
        this.trackAdminEvent("invite.opened");
    }

    inviteSent(inviteType?: string): void {
        this.trackAdminEvent("invite.sent", { inviteType });
    }

    inviteAccepted(inviteType?: string): void {
        this.trackAdminEvent("invite.accepted", { inviteType });
    }

    lockDiscussion(): void {
        this.posthog?.capture("wa_lockroom");
        this.trackAdminEvent("bubble.lock.toggled");
    }

    lockArea(areaId: string, areaName: string | undefined, locked: boolean): void {
        this.trackAdminEvent("map_editor.area.lock.toggled", { areaId, areaName, locked });
    }

    screenSharing(): void {
        this.posthog?.capture("wa-screensharing");
        this.trackAdminEvent("meeting.screenshare.toggled");
    }

    screenSharingStarted(screenShareSessionId: string, hasAudio: boolean): void {
        if (!this.canSendAdminAnalytics()) {
            return;
        }

        this.openScreenShares.get(screenShareSessionId)?.close("other");
        this.openScreenShares.set(
            screenShareSessionId,
            openTimedAnalyticsEvent(
                "meeting.screenshare.ended",
                { screenShareSessionId, hasAudio },
                this.sendTimedEventReport
            )
        );
    }

    /**
     * The caller no longer passes a duration, and cannot: the pusher measures the
     * interval. This used to take a client-computed durationSeconds straight into the
     * pipeline.
     */
    screenSharingEnded(screenShareSessionId: string): void {
        this.openScreenShares.get(screenShareSessionId)?.close("left_conversation");
        this.openScreenShares.delete(screenShareSessionId);
    }

    follow(): void {
        this.posthog?.capture("wa_follow");
        this.trackAdminEvent("user.follow_requested");
    }

    camera(): void {
        this.posthog?.capture("wa_camera");
        this.trackAdminEvent("media.camera.toggled");
    }

    microphone(): void {
        this.posthog?.capture("wa_microphone");
        this.trackAdminEvent("media.microphone.toggled");
    }

    retryConnectionWebRtc(): void {
        this.posthog?.capture("wa_retry_connection_webrtc");
        this.trackAdminEvent("media.connection_retry", { meetingProvider: "webrtc" });
    }

    retryConnectionLivekit(): void {
        this.posthog?.capture("wa_retry_connection_livekit");
        this.trackAdminEvent("media.connection_retry", { meetingProvider: "livekit" });
    }

    openBackgroundSettings(): void {
        this.posthog?.capture("wa_open_background_settings");
        this.trackAdminEvent("settings.background.opened");
    }

    selectCamera(): void {
        this.posthog?.capture("wa_select_camera");
        this.trackAdminEvent("settings.camera.selected");
    }

    selectMicrophone(): void {
        this.posthog?.capture("wa_select_microphone");
        this.trackAdminEvent("settings.microphone.selected");
    }

    selectSpeaker(): void {
        this.posthog?.capture("wa_select_speaker");
        this.trackAdminEvent("settings.speaker.selected");
    }

    settingMicrophone(value: string): void {
        this.posthog?.capture("wa_setting_microphone", { checkbox: value });
        this.trackAdminEvent("settings.microphone.changed", { value });
    }

    settingBackground(background: string): void {
        this.posthog?.capture("wa_setting_background", { backgroundType: background });
        this.trackAdminEvent("settings.background.changed", { backgroundType: background });
    }

    settingCamera(value: string): void {
        this.posthog?.capture("wa_setting_camera", { checkbox: value });
        this.trackAdminEvent("settings.camera.changed", { value });
    }

    settingNotification(value: string): void {
        this.posthog?.capture("wa_setting_notification", { checkbox: value });
        this.trackAdminEvent("settings.notification.changed", { value });
    }

    settingPictureInPicture(value: string): void {
        this.posthog?.capture("wa_setting_picture_in_picture", { checkbox: value });
        this.trackAdminEvent("settings.picture_in_picture.changed", { value });
    }

    settingFullscreen(value: string): void {
        this.posthog?.capture("wa_setting_fullscreen", { checkbox: value });
        this.trackAdminEvent("settings.fullscreen.changed", { value });
    }

    settingAskWebsite(value: string): void {
        this.posthog?.capture("wa_setting_ask_website", { checkbox: value });
        this.trackAdminEvent("settings.ask_website.changed", { value });
    }

    settingRequestFollow(value: string): void {
        this.posthog?.capture("wa_setting_request_follow", { checkbox: value });
        this.trackAdminEvent("settings.request_follow.changed", { value });
    }

    settingDecreaseAudioVolume(value: string): void {
        this.posthog?.capture("wa_setting_decrease_audio_volume", { checkbox: value });
        this.trackAdminEvent("settings.decrease_audio_volume.changed", { value });
    }

    login(): void {
        this.posthog?.capture("wa_login");
        this.trackAdminEvent("auth.login_clicked");
    }

    logout(): void {
        this.posthog?.capture("wa_logout");
        this.trackAdminEvent("auth.logout_clicked");
    }

    openedWebsite(url: URL, context: CowebsiteOpenedAnalyticsContext = {}): void {
        // Origin only before it reaches PostHog too: cowebsite URLs carry auth tokens
        // in the query/hash and the document name in the path. The admin sink does the
        // same via buildCowebsiteOpenedProperties; keep both in sync.
        this.posthog?.capture("wa_opened_website", { url: this.stripUrlToOrigin(url) });
        this.trackAdminEvent("cowebsite.opened", this.buildCowebsiteOpenedProperties(url, context));
    }

    menuCredit(): void {
        this.posthog?.capture("wa_menu_credit");
        this.trackAdminEvent("menu.credit.opened");
    }

    menuProfile(): void {
        this.posthog?.capture("wa_menu_profile");
        this.trackAdminEvent("profile.opened");
    }

    menuSetting() {
        this.posthog?.capture("wa_menu_setting");
        this.trackAdminEvent("settings.opened");
    }

    menuChat(): void {
        this.posthog?.capture("wa_menu_chat");
        this.trackAdminEvent("menu.chat.opened");
    }

    menuCustom(name: string): void {
        this.posthog?.capture("wa_menu_custom", { name });
        this.trackAdminEvent("menu.custom.opened", { name });
    }

    menuShortcuts(): void {
        this.posthog?.capture("wa_menu_shortcuts");
        this.trackAdminEvent("menu.shortcuts.opened");
    }

    globalMessage(): void {
        this.posthog?.capture("wa_menu_globalmessage");
        this.trackAdminEvent("global_message.opened");
    }

    sendGlocalTextMessage(): void {
        this.posthog?.capture("wa_menu_globalmessage_send");
        this.trackAdminEvent("global_message.text_sent");
    }

    sendGlobalSoundMessage(): void {
        this.posthog?.capture("wa_menu_globalmessage_sound");
        this.trackAdminEvent("global_message.sound_sent");
    }

    reportIssue(): void {
        this.posthog?.capture("wa_menu_report");
        this.trackAdminEvent("feedback.opened", { feedbackSource: "external_report_url" });
    }

    feedbackOpened(feedbackSource: "sentry" | "external_report_url" = "sentry"): void {
        this.trackAdminEvent("feedback.opened", { feedbackSource });
    }

    feedbackSubmitted(feedbackSource: "sentry" | "external_report_url" = "sentry", hasScreenshot?: boolean): void {
        this.trackAdminEvent("feedback.submitted", { feedbackSource, hasScreenshot });
    }

    menuContact(): void {
        this.posthog?.capture("wa_menu_contact");
        this.trackAdminEvent("menu.contact.opened");
    }

    inviteCopyLink(): void {
        this.posthog?.capture("wa_menu_invite_copylink");
        this.inviteSent("copy_link");
    }

    inviteCopyLinkWalk(value: string): void {
        this.posthog?.capture("wa_menu_invite_copylink_walk", { checkbox: value });
        this.trackAdminEvent("invite.walk_link_option_changed", { value });
    }

    editCompanion(): void {
        this.posthog?.capture("wa_edit_companion");
        this.trackAdminEvent("profile.companion_edit_opened");
    }

    editCamera(): void {
        this.posthog?.capture("wa_edit_camera");
        this.trackAdminEvent("profile.camera_edit_opened");
    }

    editName(): void {
        this.posthog?.capture("wa_edit_name");
        this.trackAdminEvent("profile.name_edit_opened");
    }

    editWoka(): void {
        this.posthog?.capture("wa_edit_woka");
        this.trackAdminEvent("profile.woka_edit_opened");
    }

    goToPersonalDesk(): void {
        this.posthog?.capture("wa_go_to_personal_desk");
        this.trackAdminEvent("personal_desk.entered");
    }

    unclaimPersonalDesk(): void {
        this.posthog?.capture("wa_unclaim_personal_desk");
        this.trackAdminEvent("personal_desk.unclaimed");
    }

    selectWoka(): void {
        this.posthog?.capture("wa_wokascene_select");
        this.trackAdminEvent("onboarding.woka_selected");
    }

    selectCompanion(): void {
        this.posthog?.capture("wa_companionscene_select");
        this.trackAdminEvent("onboarding.companion_selected");
    }

    selectCustomWoka(): void {
        this.posthog?.capture("wa_wokascene_custom");
        this.trackAdminEvent("onboarding.custom_woka_selected");
    }

    layoutPresentChange(): void {
        this.posthog?.capture("wa_layout_present");
        this.trackAdminEvent("meeting.layout_changed", { layout: "presentation" });
    }

    addNewParticipant(peerId: string, userId: string, uuid: string): void {
        this.posthog?.capture("wa_spontaneous_discussion", { peerId, userId, uuid });
        this.trackAdminEvent("conversation.participant_added");
    }

    openMegaphone(): void {
        this.posthog?.capture("wa_action_megaphone");
        this.trackAdminEvent("megaphone.opened");
    }

    startMegaphone(): void {
        this.posthog?.capture("wa_start_megaphone");
        this.trackAdminEvent("megaphone.started");
    }

    stopMegaphone(): void {
        this.posthog?.capture("wa_stop_megaphone");
        this.trackAdminEvent("megaphone.ended");
    }

    toggleMapEditor(open: boolean): void {
        this.posthog?.capture(`wa_mapeditor_${open ? "open" : "close"}`);
        this.trackAdminEvent(open ? "map_editor.opened" : "map_editor.closed");
    }

    addMapEditorProperty(type: string, propertyName: string): void {
        // 8 decembre 2023: this event is not used anymore
        // this.posthog?.capture(`wa_map-editor_${type}_add_${propertyName}_property`);
        this.posthog?.capture(`wa_map-editor_add_property`, { name: propertyName, type });
        this.trackAdminEvent("map_editor.property.added", { name: propertyName, type });
    }

    removeMapEditorProperty(type: string, propertyName: string): void {
        // 8 decembre 2023: this event is not used anymore
        // this.posthog?.capture(`wa_map-editor_${type}_remove_${propertyName}_property`);
        this.posthog?.capture(`wa_map-editor_remove_property`, { name: propertyName, type });
        this.trackAdminEvent("map_editor.property.removed", { name: propertyName, type });
    }

    openMapEditorTool(toolName: string): void {
        // 8 decembre 2023: this event is not used anymore
        // this.posthog?.capture(`wa_map-editor_open_${toolName}`);
        this.posthog?.capture(`wa_map-editor_open_tool`, { name: toolName });
        this.trackAdminEvent("map_editor.tool.opened", { name: toolName });
    }

    clickPropertyMapEditor(name: string, style?: string): void {
        this.posthog?.capture(`wa_map-editor_click_property`, { name, style });
        this.trackAdminEvent("map_editor.property.clicked", { name, style });
    }

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
        this.openAreas.get(id)?.close("other");
        this.openAreas.set(
            id,
            openTimedAnalyticsEvent("area.dwell", { areaId: id, areaName: name }, this.sendTimedEventReport)
        );
    }

    leaveArea(id: string, name: string): void {
        this.posthog?.capture(`wa_map-editor_leaver_area`, { id, name });
        this.openAreas.get(id)?.close("left_area");
        this.openAreas.delete(id);
    }

    enterAreaMapEditor(id: string, name: string): void {
        this.enterArea(id, name);
    }

    leaveAreaMapEditor(id: string, name: string): void {
        this.leaveArea(id, name);
    }

    turnTestSuccess(protocol: string | null): void {
        this.posthog?.capture(`wa_turn_test_success`, { protocol });
        this.trackAdminEvent("media.turn_test.succeeded", { protocol });
    }

    turnTestFailure(): void {
        this.posthog?.capture(`wa_turn_test_failure`);
        this.trackAdminEvent("media.turn_test.failed");
    }
    turnTestTimeout(): void {
        this.posthog?.capture(`wa_turn_test_timeout`);
        this.trackAdminEvent("media.turn_test.timeout");
    }

    noVideoStreamReceived(): void {
        this.posthog?.capture(`wa_no_video_stream_received`);
        this.trackAdminEvent("media.video_stream_missing");
    }

    moreActionMetting(): void {
        this.posthog?.capture("wa_more_meeting_action");
        this.trackAdminEvent("meeting.actions.opened");
    }

    pinMeetingAction(): void {
        this.posthog?.capture("wa_pin_meeting_action");
        this.trackAdminEvent("meeting.participant.pinned");
    }

    muteMicrophoneMeetingAction(): void {
        this.posthog?.capture("wa_mute_microphone_meeting_action");
        this.trackAdminEvent("meeting.microphone.muted");
    }

    muteMicrophoneEverybodyMeetingAction(): void {
        this.posthog?.capture("wa_mute_microphone_everybody_meeting_action");
        this.trackAdminEvent("meeting.microphone.muted_for_everybody");
    }

    muteVideoMeetingAction(): void {
        this.posthog?.capture("wa_mute_video_meeting_action");
        this.trackAdminEvent("meeting.video.muted");
    }
    muteVideoEverybodyMeetingAction(): void {
        this.posthog?.capture("wa_mute_video_everybody_meeting_action");
        this.trackAdminEvent("meeting.video.muted_for_everybody");
    }

    kickoffMeetingAction(): void {
        this.posthog?.capture("wa_kickoff_meeting_action");
        this.trackAdminEvent("meeting.participant.kicked");
    }

    sendPrivateMessageMeetingAction(): void {
        this.posthog?.capture("wa_send_private_message_meeting_action");
        this.trackAdminEvent("meeting.private_message.clicked");
    }

    reportMeetingAction(): void {
        this.posthog?.capture("wa_report_meeting_action");
        this.trackAdminEvent("meeting.report.clicked");
    }

    openExplorationMode(): void {
        this.posthog?.capture(`wa_map-exploration-open`);
        this.trackAdminEvent("map_explorer.opened");
    }

    closeExplorationMode(): void {
        this.posthog?.capture(`wa_map-exploration-close`);
        this.trackAdminEvent("map_explorer.closed");
    }

    openedRoomList(): void {
        this.posthog?.capture("wa-opened-room-list");
        this.trackAdminEvent("room_list.opened");
    }

    clickedRoomListRoom(roomId?: string): void {
        this.trackAdminEvent("room_list.room_clicked", { roomId });
    }

    openedPopup(targetRectangle: string, id: number): void {
        this.posthog?.capture("wa_opened_popup", { targetRectangle, id });
        this.trackAdminEvent("popup.opened", { targetRectangle, id });
    }

    openGlobalMessage(): void {
        this.posthog?.capture("wa_action_globalmessage");
        this.trackAdminEvent("global_message.opened");
    }

    openGlobalAudio(): void {
        this.posthog?.capture("wa_action_globalaudio");
        this.trackAdminEvent("global_audio.opened");
    }

    openExternalModuleCalendar(): void {
        this.posthog?.capture("wa-opened-external-module-calendar");
        this.trackAdminEvent("external_module.calendar_opened");
    }

    openExternalModuleTodoList(): void {
        this.posthog?.capture("wa-opened-external-module-todolist");
        this.trackAdminEvent("external_module.todo_list_opened");
    }

    openExternalModule(): void {
        this.posthog?.capture("wa-opened-external-module");
        this.trackAdminEvent("external_module.opened");
    }

    settingAudioVolume(): void {
        this.posthog?.capture("wa_setting_audio_volume");
        this.trackAdminEvent("settings.audio_volume.opened");
    }

    openPicker(applicationName: string): void {
        this.posthog?.capture("wa_map-editor_open_picker", { applicationName });
        this.trackAdminEvent("map_editor.application_picker.opened", { applicationName });
    }

    openApplicationWithoutPicker(applicationName: string): void {
        this.posthog?.capture("wa_map-editor_open_application", { applicationName });
        this.trackAdminEvent("map_editor.application.opened", { applicationName });
    }

    openCowebsiteInNewTab(): void {
        this.posthog?.capture("wa_open_cowebsite_in_new_tab");
        this.trackAdminEvent("cowebsite.opened_in_new_tab");
    }
    copyCowebsiteLink(): void {
        this.posthog?.capture("wa_copy_cowebsite_link");
        this.trackAdminEvent("cowebsite.link_copied");
    }
    closeCowebsite(): void {
        this.posthog?.capture("wa_close_cowebsite");
        this.trackAdminEvent("cowebsite.closed");
    }
    fullScreenCowebsite(): void {
        this.posthog?.capture("wa_fullscreen_cowebsite");
        this.trackAdminEvent("cowebsite.fullscreen_opened");
    }
    switchCowebsite(): void {
        this.posthog?.capture("wa_switch_cowebsite");
        this.trackAdminEvent("cowebsite.switched");
    }
    openProfileMenu(): void {
        this.posthog?.capture("wa_open_profile_menu");
        this.trackAdminEvent("profile.opened");
    }
    filterInMapExplorer(): void {
        this.posthog?.capture("wa_filter_in_map_explorer");
        this.trackAdminEvent("map_explorer.filtered");
    }
    resizeCameraLayout(): void {
        this.posthog?.capture("wa_resize_camera_layout");
        this.trackAdminEvent("meeting.camera_layout_resized");
    }
    openUserList(): void {
        this.posthog?.capture("wa_open_user_list");
        this.trackAdminEvent("user_list.opened");
    }
    openMessageList(): void {
        this.posthog?.capture("wa_open_message_list");
        this.trackAdminEvent("chat.message_list_opened");
    }

    sendMessageFromUserList(): void {
        this.posthog?.capture("wa_send_message_from_user_list");
        this.trackAdminEvent("chat.message_from_user_list_clicked");
    }
    createMatrixRoom(): void {
        this.posthog?.capture("wa_create_matrix_room");
        this.trackAdminEvent("chat.matrix_room.created");
    }
    createMatrixFolder(): void {
        this.posthog?.capture("wa_create_matrix_folder");
        this.trackAdminEvent("chat.matrix_folder.created");
    }
    startMatrixEncryptionConfiguration(): void {
        this.posthog?.capture("wa_start_matrix_encryption_configuration");
        this.trackAdminEvent("chat.matrix_encryption_configuration.started");
    }
    externalModuleChatBandClick(externalModuleName: string, action: string): void {
        this.posthog?.capture("wa_external_module_chat_band_click", { externalModuleName, action });
        this.trackAdminEvent("external_module.chat_band.clicked", { externalModuleName, action });
    }
    dragDropFile() {
        this.posthog?.capture("wa_drag_drop_file");
        this.trackAdminEvent("file.drag_dropped");
    }

    meetingStarted(properties: MeetingAnalyticsProperties = {}): void {
        this.trackAdminEvent("meeting.started", properties);
    }

    meetingEnded(properties: MeetingAnalyticsProperties = {}): void {
        this.trackAdminEvent("meeting.ended", properties);
    }

    // meeting.provider_changed is emitted by ConversationAnalytics, which owns the
    // provider transition and reports it with the conversation's context. A second
    // emitter lived here with a different payload for the same event name; nothing
    // ever called it, so it was only ever going to give the event two shapes the
    // day someone did.

    sessionStarted(roomId?: string): void {
        this.trackAdminEvent("session.started", { roomId, schemaVersion: 1 });
    }

    sessionEnded(roomId?: string): void {
        this.trackAdminEvent("session.ended", { roomId, schemaVersion: 1 });
    }

    mapEditorSaveStarted(scope?: string): void {
        this.trackAdminEvent("map_editor.save.started", { scope });
    }

    mapEditorSaveSucceeded(scope?: string, durationMs?: number): void {
        this.trackAdminEvent("map_editor.save.succeeded", { scope, durationMs });
    }

    mapEditorSaveFailed(scope?: string, reason?: string, durationMs?: number): void {
        this.trackAdminEvent("map_editor.save.failed", { scope, reason, durationMs });
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
    ): AdminAnalyticsProperties {
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
            // inside a URL. It is deliberately NOT in the anonymization allowlist
            // (AnalyticsEventsQueue.ANONYMOUS_SAFE_PROPERTY_KEYS): document names are
            // frequently sensitive (NDA-acme.pdf, salary-2026.xlsx), so a world that
            // opts out of user-level activity stops sending them, and the internal
            // Kiosk does not project the column at all — only the world's own
            // back-office shows it.
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
        this.posthog?.capture("wa_say_bubble_open");
        this.trackAdminEvent("bubble.say.opened");
    }
    openThinkBubble(): void {
        this.posthog?.capture("wa_think_bubble_open");
        this.trackAdminEvent("bubble.think.opened");
    }
    clickTopOpenMapExplorer(): void {
        this.posthog?.capture("wa_click_top_open_map_explorer");
        this.trackAdminEvent("map_explorer.top_button_clicked");
    }
    clickCenterToUser(): void {
        this.posthog?.capture("wa_click_center_to_user");
        this.trackAdminEvent("map_explorer.center_to_user_clicked");
    }
    clickToZoomIn(): void {
        this.posthog?.capture("wa_click_to_zoom_in");
        this.trackAdminEvent("map_explorer.zoom_in_clicked");
    }
    clickToZoomOut(): void {
        this.posthog?.capture("wa_click_to_zoom_out");
        this.trackAdminEvent("map_explorer.zoom_out_clicked");
    }
    clickPictureInPicture(open: boolean): void {
        this.posthog?.capture("wa_click_picture_in_picture", { open });
        this.trackAdminEvent("meeting.picture_in_picture.toggled", { open });
    }
    goToUser(): void {
        this.posthog?.capture("wa_go_to_user");
        this.trackAdminEvent("user.go_to_clicked");
    }
    showBusinessCard(): void {
        this.posthog?.capture("wa_show_business_card");
        this.trackAdminEvent("user.business_card.opened");
    }
    reportUser(): void {
        this.posthog?.capture("wa_report_user");
        this.trackAdminEvent("user.report.clicked");
    }
    openWokaMenu(): void {
        this.posthog?.capture("wa_open_woka_menu");
        this.trackAdminEvent("user.woka_menu.opened");
    }

    recordingStart(): void {
        this.posthog?.capture("wa_recording_start");
        this.trackAdminEvent("recording.started");
    }

    recordingStop(): void {
        this.posthog?.capture("wa_recording_stop");
        this.trackAdminEvent("recording.stopped");
    }

    openedRecordingList(): void {
        this.posthog?.capture("wa_opened_recording_list");
        this.trackAdminEvent("recording.list_opened");
    }

    /** Web app install prompt analytics */
    pwaInstallPromptShown(isIos: boolean): void {
        this.posthog?.capture("wa_pwa_install_prompt_shown", { isIos });
        this.trackAdminEvent("pwa.install_prompt_shown", { isIos });
    }

    pwaInstallClick(): void {
        this.posthog?.capture("wa_pwa_install_click");
        this.trackAdminEvent("pwa.install_clicked");
    }

    pwaContinueInBrowserClick(): void {
        this.posthog?.capture("wa_pwa_continue_in_browser_click");
        this.trackAdminEvent("pwa.continue_in_browser_clicked");
    }

    pwaInstallOutcome(outcome: "accepted" | "dismissed"): void {
        this.posthog?.capture("wa_pwa_install_outcome", { outcome });
        this.trackAdminEvent("pwa.install_outcome", { outcome });
    }
    pwaInstallFromProfileMenuClick(): void {
        this.posthog?.capture("wa_pwa_install_from_profile_menu_click");
        this.trackAdminEvent("pwa.install_from_profile_menu_clicked");
    }
    socketReconnecting(): void {
        this.posthog?.capture("wa_socket_reconnecting");
    }
    socketReconnected(): void {
        this.posthog?.capture("wa_socket_reconnected");
    }
}
export const analyticsClient = new AnalyticsClient();
