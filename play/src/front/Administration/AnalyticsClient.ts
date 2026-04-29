import type { PostHog } from "@posthog/types";
import type { Emoji } from "../Stores/Utils/emojiSchema";
import { POSTHOG_API_KEY, POSTHOG_URL } from "../Enum/EnvironmentVariable";

declare global {
    interface Window {
        posthog?: PostHog;
    }
}

class AnalyticsClient {
    constructor() {
        if ((POSTHOG_API_KEY || POSTHOG_URL) && (!POSTHOG_API_KEY || !POSTHOG_URL)) {
            console.warn("PostHog is partially configured. Analytics will not be sent.");
        }

        if (POSTHOG_API_KEY && POSTHOG_URL && !this.posthog) {
            console.warn("PostHog is configured but not initialized. Analytics will not be sent.");
        }
    }

    private get posthog(): PostHog | undefined {
        return window.posthog;
    }

    identifyUser(uuid: string, email: string | null, roomId: string | null): void {
        this.posthog?.identify(uuid, { uuid, email, wa: true, roomId });
    }

    loggedWithSso(): void {
        this.posthog?.capture("wa-logged-sso");
    }

    loggedWithToken(): void {
        this.posthog?.capture("wa-logged-token");
    }

    enteredRoom(roomId: string, roomGroup: string | null): void {
        this.posthog?.capture("$pageView", { roomId, roomGroup });
        this.posthog?.capture("enteredRoom");
    }

    openedMenu(): void {
        this.posthog?.capture("wa-opened-menu");
    }

    launchEmote(emote: Emoji): void {
        this.posthog?.capture("wa-emote-launch", { ...emote });
    }

    editEmote(): void {
        this.posthog?.capture("wa-emote-edit");
    }

    clickOnCustomButton(id: string, label?: string, toolTip?: string, imageSrc?: string) {
        this.posthog?.capture("wa-custom-button", { id, label, toolTip, imageSrc });
    }

    enteredJitsi(roomName: string, roomId: string): void {
        this.posthog?.capture("wa-entered-jitsi", { roomName, roomId });
    }

    enteredMeetingRoom(roomName: string, roomId: string): void {
        this.posthog?.capture("wa-entered-meeting-room", { roomName, roomId });
    }

    validationName(): void {
        this.posthog?.capture("wa-name-validation");
    }

    validationWoka(scene: string): void {
        this.posthog?.capture("wa-woka-validation", { scene });
    }

    validationVideo(): void {
        this.posthog?.capture("wa-video-validation");
    }

    /** New feature analytics **/
    openedChat(): void {
        this.posthog?.capture("wa-opened-chat");
    }

    openInvite(): void {
        this.posthog?.capture("wa-opened-invite");
    }

    lockDiscussion(): void {
        this.posthog?.capture("wa_lockroom");
    }

    screenSharing(): void {
        this.posthog?.capture("wa-screensharing");
    }

    follow(): void {
        this.posthog?.capture("wa_follow");
    }

    camera(): void {
        this.posthog?.capture("wa_camera");
    }

    microphone(): void {
        this.posthog?.capture("wa_microphone");
    }

    retryConnectionWebRtc(): void {
        this.posthog?.capture("wa_retry_connection_webrtc");
    }

    retryConnectionLivekit(): void {
        this.posthog?.capture("wa_retry_connection_livekit");
    }

    openBackgroundSettings(): void {
        this.posthog?.capture("wa_open_background_settings");
    }

    selectCamera(): void {
        this.posthog?.capture("wa_select_camera");
    }

    selectMicrophone(): void {
        this.posthog?.capture("wa_select_microphone");
    }

    selectSpeaker(): void {
        this.posthog?.capture("wa_select_speaker");
    }

    settingMicrophone(value: string): void {
        this.posthog?.capture("wa_setting_microphone", { checkbox: value });
    }

    settingBackground(background: string): void {
        this.posthog?.capture("wa_setting_background", { backgroundType: background });
    }

    settingCamera(value: string): void {
        this.posthog?.capture("wa_setting_camera", { checkbox: value });
    }

    settingNotification(value: string): void {
        this.posthog?.capture("wa_setting_notification", { checkbox: value });
    }

    settingPictureInPicture(value: string): void {
        this.posthog?.capture("wa_setting_picture_in_picture", { checkbox: value });
    }

    settingFullscreen(value: string): void {
        this.posthog?.capture("wa_setting_fullscreen", { checkbox: value });
    }

    settingAskWebsite(value: string): void {
        this.posthog?.capture("wa_setting_ask_website", { checkbox: value });
    }

    settingRequestFollow(value: string): void {
        this.posthog?.capture("wa_setting_request_follow", { checkbox: value });
    }

    settingDecreaseAudioVolume(value: string): void {
        this.posthog?.capture("wa_setting_decrease_audio_volume", { checkbox: value });
    }

    login(): void {
        this.posthog?.capture("wa_login");
    }

    logout(): void {
        this.posthog?.capture("wa_logout");
    }

    openedWebsite(url: URL): void {
        this.posthog?.capture("wa_opened_website", { url: url.toString() });
    }

    menuCredit(): void {
        this.posthog?.capture("wa_menu_credit");
    }

    menuProfile(): void {
        this.posthog?.capture("wa_menu_profile");
    }

    menuSetting() {
        this.posthog?.capture("wa_menu_setting");
    }

    menuChat(): void {
        this.posthog?.capture("wa_menu_chat");
    }

    menuCustom(name: string): void {
        this.posthog?.capture("wa_menu_custom", { name });
    }

    menuShortcuts(): void {
        this.posthog?.capture("wa_menu_shortcuts");
    }

    globalMessage(): void {
        this.posthog?.capture("wa_menu_globalmessage");
    }

    sendGlocalTextMessage(): void {
        this.posthog?.capture("wa_menu_globalmessage_send");
    }

    sendGlobalSoundMessage(): void {
        this.posthog?.capture("wa_menu_globalmessage_sound");
    }

    reportIssue(): void {
        this.posthog?.capture("wa_menu_report");
    }

    menuContact(): void {
        this.posthog?.capture("wa_menu_contact");
    }

    inviteCopyLink(): void {
        this.posthog?.capture("wa_menu_invite_copylink");
    }

    inviteCopyLinkWalk(value: string): void {
        this.posthog?.capture("wa_menu_invite_copylink_walk", { checkbox: value });
    }

    editCompanion(): void {
        this.posthog?.capture("wa_edit_companion");
    }

    editCamera(): void {
        this.posthog?.capture("wa_edit_camera");
    }

    editName(): void {
        this.posthog?.capture("wa_edit_name");
    }

    editWoka(): void {
        this.posthog?.capture("wa_edit_woka");
    }

    goToPersonalDesk(): void {
        this.posthog?.capture("wa_go_to_personal_desk");
    }

    unclaimPersonalDesk(): void {
        this.posthog?.capture("wa_unclaim_personal_desk");
    }

    selectWoka(): void {
        this.posthog?.capture("wa_wokascene_select");
    }

    selectCompanion(): void {
        this.posthog?.capture("wa_companionscene_select");
    }

    selectCustomWoka(): void {
        this.posthog?.capture("wa_wokascene_custom");
    }

    layoutPresentChange(): void {
        this.posthog?.capture("wa_layout_present");
    }

    addNewParticipant(peerId: string, userId: string, uuid: string): void {
        this.posthog?.capture("wa_spontaneous_discussion", { peerId, userId, uuid });
    }

    openMegaphone(): void {
        this.posthog?.capture("wa_action_megaphone");
    }

    startMegaphone(): void {
        this.posthog?.capture("wa_start_megaphone");
    }

    stopMegaphone(): void {
        this.posthog?.capture("wa_stop_megaphone");
    }

    toggleMapEditor(open: boolean): void {
        this.posthog?.capture(`wa_mapeditor_${open ? "open" : "close"}`);
    }

    addMapEditorProperty(type: string, propertyName: string): void {
        // 8 decembre 2023: this event is not used anymore
        // this.posthog?.capture(`wa_map-editor_${type}_add_${propertyName}_property`);
        this.posthog?.capture(`wa_map-editor_add_property`, { name: propertyName, type });
    }

    removeMapEditorProperty(type: string, propertyName: string): void {
        // 8 decembre 2023: this event is not used anymore
        // this.posthog?.capture(`wa_map-editor_${type}_remove_${propertyName}_property`);
        this.posthog?.capture(`wa_map-editor_remove_property`, { name: propertyName, type });
    }

    openMapEditorTool(toolName: string): void {
        // 8 decembre 2023: this event is not used anymore
        // this.posthog?.capture(`wa_map-editor_open_${toolName}`);
        this.posthog?.capture(`wa_map-editor_open_tool`, { name: toolName });
    }

    clickPropertyMapEditor(name: string, style?: string): void {
        this.posthog?.capture(`wa_map-editor_click_property`, { name, style });
    }

    enterAreaMapEditor(id: string, name: string): void {
        this.posthog?.capture(`wa_map-editor_enter_area`, { id, name });
    }

    leaveAreaMapEditor(id: string, name: string): void {
        this.posthog?.capture(`wa_map-editor_leaver_area`, { id, name });
    }

    turnTestSuccess(protocol: string | null): void {
        this.posthog?.capture(`wa_turn_test_success`, { protocol });
    }

    turnTestFailure(): void {
        this.posthog?.capture(`wa_turn_test_failure`);
    }
    turnTestTimeout(): void {
        this.posthog?.capture(`wa_turn_test_timeout`);
    }

    noVideoStreamReceived(): void {
        this.posthog?.capture(`wa_no_video_stream_received`);
    }

    moreActionMetting(): void {
        this.posthog?.capture("wa_more_meeting_action");
    }

    pinMeetingAction(): void {
        this.posthog?.capture("wa_pin_meeting_action");
    }

    muteMicrophoneMeetingAction(): void {
        this.posthog?.capture("wa_mute_microphone_meeting_action");
    }

    muteMicrophoneEverybodyMeetingAction(): void {
        this.posthog?.capture("wa_mute_microphone_everybody_meeting_action");
    }

    muteVideoMeetingAction(): void {
        this.posthog?.capture("wa_mute_video_meeting_action");
    }
    muteVideoEverybodyMeetingAction(): void {
        this.posthog?.capture("wa_mute_video_everybody_meeting_action");
    }

    kickoffMeetingAction(): void {
        this.posthog?.capture("wa_kickoff_meeting_action");
    }

    sendPrivateMessageMeetingAction(): void {
        this.posthog?.capture("wa_send_private_message_meeting_action");
    }

    reportMeetingAction(): void {
        this.posthog?.capture("wa_report_meeting_action");
    }

    openExplorationMode(): void {
        this.posthog?.capture(`wa_map-exploration-open`);
    }

    closeExplorationMode(): void {
        this.posthog?.capture(`wa_map-exploration-close`);
    }

    openedRoomList(): void {
        this.posthog?.capture("wa-opened-room-list");
    }

    openedPopup(targetRectangle: string, id: number): void {
        this.posthog?.capture("wa_opened_popup", { targetRectangle, id });
    }

    openGlobalMessage(): void {
        this.posthog?.capture("wa_action_globalmessage");
    }

    openGlobalAudio(): void {
        this.posthog?.capture("wa_action_globalaudio");
    }

    openExternalModuleCalendar(): void {
        this.posthog?.capture("wa-opened-external-module-calendar");
    }

    openExternalModuleTodoList(): void {
        this.posthog?.capture("wa-opened-external-module-todolist");
    }

    openExternalModule(): void {
        this.posthog?.capture("wa-opened-external-module");
    }

    settingAudioVolume(): void {
        this.posthog?.capture("wa_setting_audio_volume");
    }

    openPicker(applicationName: string): void {
        this.posthog?.capture("wa_map-editor_open_picker", { applicationName });
    }

    openApplicationWithoutPicker(applicationName: string): void {
        this.posthog?.capture("wa_map-editor_open_application", { applicationName });
    }

    openCowebsiteInNewTab(): void {
        this.posthog?.capture("wa_open_cowebsite_in_new_tab");
    }
    copyCowebsiteLink(): void {
        this.posthog?.capture("wa_copy_cowebsite_link");
    }
    closeCowebsite(): void {
        this.posthog?.capture("wa_close_cowebsite");
    }
    fullScreenCowebsite(): void {
        this.posthog?.capture("wa_fullscreen_cowebsite");
    }
    switchCowebsite(): void {
        this.posthog?.capture("wa_switch_cowebsite");
    }
    openProfileMenu(): void {
        this.posthog?.capture("wa_open_profile_menu");
    }
    filterInMapExplorer(): void {
        this.posthog?.capture("wa_filter_in_map_explorer");
    }
    resizeCameraLayout(): void {
        this.posthog?.capture("wa_resize_camera_layout");
    }
    openUserList(): void {
        this.posthog?.capture("wa_open_user_list");
    }
    openMessageList(): void {
        this.posthog?.capture("wa_open_message_list");
    }

    sendMessageFromUserList(): void {
        this.posthog?.capture("wa_send_message_from_user_list");
    }
    createMatrixRoom(): void {
        this.posthog?.capture("wa_create_matrix_room");
    }
    createMatrixFolder(): void {
        this.posthog?.capture("wa_create_matrix_folder");
    }
    startMatrixEncryptionConfiguration(): void {
        this.posthog?.capture("wa_start_matrix_encryption_configuration");
    }
    externalModuleChatBandClick(externalModuleName: string, action: string): void {
        this.posthog?.capture("wa_external_module_chat_band_click", { externalModuleName, action });
    }
    dragDropFile() {
        this.posthog?.capture("wa_drag_drop_file");
    }
    openSayBubble(): void {
        this.posthog?.capture("wa_say_bubble_open");
    }
    openThinkBubble(): void {
        this.posthog?.capture("wa_think_bubble_open");
    }
    clickTopOpenMapExplorer(): void {
        this.posthog?.capture("wa_click_top_open_map_explorer");
    }
    clickCenterToUser(): void {
        this.posthog?.capture("wa_click_center_to_user");
    }
    clickToZoomIn(): void {
        this.posthog?.capture("wa_click_to_zoom_in");
    }
    clickToZoomOut(): void {
        this.posthog?.capture("wa_click_to_zoom_out");
    }
    clickPictureInPicture(open: boolean): void {
        this.posthog?.capture("wa_click_picture_in_picture", { open });
    }
    goToUser(): void {
        this.posthog?.capture("wa_go_to_user");
    }
    showBusinessCard(): void {
        this.posthog?.capture("wa_show_business_card");
    }
    reportUser(): void {
        this.posthog?.capture("wa_report_user");
    }
    openWokaMenu(): void {
        this.posthog?.capture("wa_open_woka_menu");
    }

    recordingStart(): void {
        this.posthog?.capture("wa_recording_start");
    }

    recordingStop(): void {
        this.posthog?.capture("wa_recording_stop");
    }

    openedRecordingList(): void {
        this.posthog?.capture("wa_opened_recording_list");
    }

    /** Web app install prompt analytics */
    pwaInstallPromptShown(isIos: boolean): void {
        this.posthog?.capture("wa_pwa_install_prompt_shown", { isIos });
    }

    pwaInstallClick(): void {
        this.posthog?.capture("wa_pwa_install_click");
    }

    pwaContinueInBrowserClick(): void {
        this.posthog?.capture("wa_pwa_continue_in_browser_click");
    }

    pwaInstallOutcome(outcome: "accepted" | "dismissed"): void {
        this.posthog?.capture("wa_pwa_install_outcome", { outcome });
    }
    pwaInstallFromProfileMenuClick(): void {
        this.posthog?.capture("wa_pwa_install_from_profile_menu_click");
    }
}
export const analyticsClient = new AnalyticsClient();
