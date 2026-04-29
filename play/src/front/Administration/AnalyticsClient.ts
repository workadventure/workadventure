import posthog from "posthog-js";
import { POSTHOG_API_KEY, POSTHOG_URL } from "../Enum/EnvironmentVariable";
import type { Emoji } from "../Stores/Utils/emojiSchema";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare let window: any;

class AnalyticsClient {
    constructor() {
        const postHogApiKey = POSTHOG_API_KEY;
        if (postHogApiKey && POSTHOG_URL) {
            posthog.init(postHogApiKey, { api_host: POSTHOG_URL });
            //the posthog toolbar need a reference in window to be able to work
            window.posthog = posthog;
        }
    }

    identifyUser(uuid: string, email: string | null, roomId: string | null): void {
        posthog.identify(uuid, { uuid, email, wa: true, roomId });
    }

    loggedWithSso(): void {
        posthog.capture("wa-logged-sso");
    }

    loggedWithToken(): void {
        posthog.capture("wa-logged-token");
    }

    enteredRoom(roomId: string, roomGroup: string | null): void {
        posthog.capture("$pageView", { roomId, roomGroup });
        posthog.capture("enteredRoom");
    }

    openedMenu(): void {
        posthog.capture("wa-opened-menu");
    }

    launchEmote(emote: Emoji): void {
        posthog.capture("wa-emote-launch", { ...emote });
    }

    editEmote(): void {
        posthog.capture("wa-emote-edit");
    }

    clickOnCustomButton(id: string, label?: string, toolTip?: string, imageSrc?: string) {
        posthog.capture("wa-custom-button", { id, label, toolTip, imageSrc });
    }

    enteredJitsi(roomName: string, roomId: string): void {
        posthog.capture("wa-entered-jitsi", { roomName, roomId });
    }

    enteredMeetingRoom(roomName: string, roomId: string): void {
        posthog.capture("wa-entered-meeting-room", { roomName, roomId });
    }

    validationName(): void {
        posthog.capture("wa-name-validation");
    }

    validationWoka(scene: string): void {
        posthog.capture("wa-woka-validation", { scene });
    }

    validationVideo(): void {
        posthog.capture("wa-video-validation");
    }

    /** New feature analytics **/
    openedChat(): void {
        posthog.capture("wa-opened-chat");
    }

    openInvite(): void {
        posthog.capture("wa-opened-invite");
    }

    lockDiscussion(): void {
        posthog.capture("wa_lockroom");
    }

    screenSharing(): void {
        posthog.capture("wa-screensharing");
    }

    follow(): void {
        posthog.capture("wa_follow");
    }

    camera(): void {
        posthog.capture("wa_camera");
    }

    microphone(): void {
        posthog.capture("wa_microphone");
    }

    retryConnectionWebRtc(): void {
        posthog.capture("wa_retry_connection_webrtc");
    }

    retryConnectionLivekit(): void {
        posthog.capture("wa_retry_connection_livekit");
    }

    openBackgroundSettings(): void {
        posthog.capture("wa_open_background_settings");
    }

    selectCamera(): void {
        posthog.capture("wa_select_camera");
    }

    selectMicrophone(): void {
        posthog.capture("wa_select_microphone");
    }

    selectSpeaker(): void {
        posthog.capture("wa_select_speaker");
    }

    settingMicrophone(value: string): void {
        posthog.capture("wa_setting_microphone", { checkbox: value });
    }

    settingBackground(background: string): void {
        posthog.capture("wa_setting_background", { backgroundType: background });
    }

    settingCamera(value: string): void {
        posthog.capture("wa_setting_camera", { checkbox: value });
    }

    settingNotification(value: string): void {
        posthog.capture("wa_setting_notification", { checkbox: value });
    }

    settingPictureInPicture(value: string): void {
        posthog.capture("wa_setting_picture_in_picture", { checkbox: value });
    }

    settingFullscreen(value: string): void {
        posthog.capture("wa_setting_fullscreen", { checkbox: value });
    }

    settingAskWebsite(value: string): void {
        posthog.capture("wa_setting_ask_website", { checkbox: value });
    }

    settingRequestFollow(value: string): void {
        posthog.capture("wa_setting_request_follow", { checkbox: value });
    }

    settingDecreaseAudioVolume(value: string): void {
        posthog.capture("wa_setting_decrease_audio_volume", { checkbox: value });
    }

    login(): void {
        posthog.capture("wa_login");
    }

    logout(): void {
        posthog.capture("wa_logout");
    }

    openedWebsite(url: URL): void {
        posthog.capture("wa_opened_website", { url: url.toString() });
    }

    menuCredit(): void {
        posthog.capture("wa_menu_credit");
    }

    menuProfile(): void {
        posthog.capture("wa_menu_profile");
    }

    menuSetting() {
        posthog.capture("wa_menu_setting");
    }

    menuChat(): void {
        posthog.capture("wa_menu_chat");
    }

    menuCustom(name: string): void {
        posthog.capture("wa_menu_custom", { name });
    }

    menuShortcuts(): void {
        posthog.capture("wa_menu_shortcuts");
    }

    globalMessage(): void {
        posthog.capture("wa_menu_globalmessage");
    }

    sendGlocalTextMessage(): void {
        posthog.capture("wa_menu_globalmessage_send");
    }

    sendGlobalSoundMessage(): void {
        posthog.capture("wa_menu_globalmessage_sound");
    }

    reportIssue(): void {
        posthog.capture("wa_menu_report");
    }

    menuContact(): void {
        posthog.capture("wa_menu_contact");
    }

    inviteCopyLink(): void {
        posthog.capture("wa_menu_invite_copylink");
    }

    inviteCopyLinkWalk(value: string): void {
        posthog.capture("wa_menu_invite_copylink_walk", { checkbox: value });
    }

    editCompanion(): void {
        posthog.capture("wa_edit_companion");
    }

    editCamera(): void {
        posthog.capture("wa_edit_camera");
    }

    editName(): void {
        posthog.capture("wa_edit_name");
    }

    editWoka(): void {
        posthog.capture("wa_edit_woka");
    }

    goToPersonalDesk(): void {
        posthog.capture("wa_go_to_personal_desk");
    }

    unclaimPersonalDesk(): void {
        posthog.capture("wa_unclaim_personal_desk");
    }

    selectWoka(): void {
        posthog.capture("wa_wokascene_select");
    }

    selectCompanion(): void {
        posthog.capture("wa_companionscene_select");
    }

    selectCustomWoka(): void {
        posthog.capture("wa_wokascene_custom");
    }

    layoutPresentChange(): void {
        posthog.capture("wa_layout_present");
    }

    addNewParticipant(peerId: string, userId: string, uuid: string): void {
        posthog.capture("wa_spontaneous_discussion", { peerId, userId, uuid });
    }

    openMegaphone(): void {
        posthog.capture("wa_action_megaphone");
    }

    startMegaphone(): void {
        posthog.capture("wa_start_megaphone");
    }

    stopMegaphone(): void {
        posthog.capture("wa_stop_megaphone");
    }

    toggleMapEditor(open: boolean): void {
        posthog.capture(`wa_mapeditor_${open ? "open" : "close"}`);
    }

    addMapEditorProperty(type: string, propertyName: string): void {
        // 8 decembre 2023: this event is not used anymore
        // posthog.capture(`wa_map-editor_${type}_add_${propertyName}_property`);
        posthog.capture(`wa_map-editor_add_property`, { name: propertyName, type });
    }

    removeMapEditorProperty(type: string, propertyName: string): void {
        // 8 decembre 2023: this event is not used anymore
        // posthog.capture(`wa_map-editor_${type}_remove_${propertyName}_property`);
        posthog.capture(`wa_map-editor_remove_property`, { name: propertyName, type });
    }

    openMapEditorTool(toolName: string): void {
        // 8 decembre 2023: this event is not used anymore
        // posthog.capture(`wa_map-editor_open_${toolName}`);
        posthog.capture(`wa_map-editor_open_tool`, { name: toolName });
    }

    clickPropertyMapEditor(name: string, style?: string): void {
        posthog.capture(`wa_map-editor_click_property`, { name, style });
    }

    enterAreaMapEditor(id: string, name: string): void {
        posthog.capture(`wa_map-editor_enter_area`, { id, name });
    }

    leaveAreaMapEditor(id: string, name: string): void {
        posthog.capture(`wa_map-editor_leaver_area`, { id, name });
    }

    turnTestSuccess(protocol: string | null): void {
        posthog.capture(`wa_turn_test_success`, { protocol });
    }

    turnTestFailure(): void {
        posthog.capture(`wa_turn_test_failure`);
    }
    turnTestTimeout(): void {
        posthog.capture(`wa_turn_test_timeout`);
    }

    noVideoStreamReceived(): void {
        posthog.capture(`wa_no_video_stream_received`);
    }

    moreActionMetting(): void {
        posthog.capture("wa_more_meeting_action");
    }

    pinMeetingAction(): void {
        posthog.capture("wa_pin_meeting_action");
    }

    muteMicrophoneMeetingAction(): void {
        posthog.capture("wa_mute_microphone_meeting_action");
    }

    muteMicrophoneEverybodyMeetingAction(): void {
        posthog.capture("wa_mute_microphone_everybody_meeting_action");
    }

    muteVideoMeetingAction(): void {
        posthog.capture("wa_mute_video_meeting_action");
    }
    muteVideoEverybodyMeetingAction(): void {
        posthog.capture("wa_mute_video_everybody_meeting_action");
    }

    kickoffMeetingAction(): void {
        posthog.capture("wa_kickoff_meeting_action");
    }

    sendPrivateMessageMeetingAction(): void {
        posthog.capture("wa_send_private_message_meeting_action");
    }

    reportMeetingAction(): void {
        posthog.capture("wa_report_meeting_action");
    }

    openExplorationMode(): void {
        posthog.capture(`wa_map-exploration-open`);
    }

    closeExplorationMode(): void {
        posthog.capture(`wa_map-exploration-close`);
    }

    openedRoomList(): void {
        posthog.capture("wa-opened-room-list");
    }

    openedPopup(targetRectangle: string, id: number): void {
        posthog.capture("wa_opened_popup", { targetRectangle, id });
    }

    openGlobalMessage(): void {
        posthog.capture("wa_action_globalmessage");
    }

    openGlobalAudio(): void {
        posthog.capture("wa_action_globalaudio");
    }

    openExternalModuleCalendar(): void {
        posthog.capture("wa-opened-external-module-calendar");
    }

    openExternalModuleTodoList(): void {
        posthog.capture("wa-opened-external-module-todolist");
    }

    openExternalModule(): void {
        posthog.capture("wa-opened-external-module");
    }

    settingAudioVolume(): void {
        posthog.capture("wa_setting_audio_volume");
    }

    openPicker(applicationName: string): void {
        posthog.capture("wa_map-editor_open_picker", { applicationName });
    }

    openApplicationWithoutPicker(applicationName: string): void {
        posthog.capture("wa_map-editor_open_application", { applicationName });
    }

    openCowebsiteInNewTab(): void {
        posthog.capture("wa_open_cowebsite_in_new_tab");
    }
    copyCowebsiteLink(): void {
        posthog.capture("wa_copy_cowebsite_link");
    }
    closeCowebsite(): void {
        posthog.capture("wa_close_cowebsite");
    }
    fullScreenCowebsite(): void {
        posthog.capture("wa_fullscreen_cowebsite");
    }
    switchCowebsite(): void {
        posthog.capture("wa_switch_cowebsite");
    }
    openProfileMenu(): void {
        posthog.capture("wa_open_profile_menu");
    }
    filterInMapExplorer(): void {
        posthog.capture("wa_filter_in_map_explorer");
    }
    resizeCameraLayout(): void {
        posthog.capture("wa_resize_camera_layout");
    }
    openUserList(): void {
        posthog.capture("wa_open_user_list");
    }
    openMessageList(): void {
        posthog.capture("wa_open_message_list");
    }

    sendMessageFromUserList(): void {
        posthog.capture("wa_send_message_from_user_list");
    }
    createMatrixRoom(): void {
        posthog.capture("wa_create_matrix_room");
    }
    createMatrixFolder(): void {
        posthog.capture("wa_create_matrix_folder");
    }
    startMatrixEncryptionConfiguration(): void {
        posthog.capture("wa_start_matrix_encryption_configuration");
    }
    externalModuleChatBandClick(externalModuleName: string, action: string): void {
        posthog.capture("wa_external_module_chat_band_click", { externalModuleName, action });
    }
    dragDropFile() {
        posthog.capture("wa_drag_drop_file");
    }
    openSayBubble(): void {
        posthog.capture("wa_say_bubble_open");
    }
    openThinkBubble(): void {
        posthog.capture("wa_think_bubble_open");
    }
    clickTopOpenMapExplorer(): void {
        posthog.capture("wa_click_top_open_map_explorer");
    }
    clickCenterToUser(): void {
        posthog.capture("wa_click_center_to_user");
    }
    clickToZoomIn(): void {
        posthog.capture("wa_click_to_zoom_in");
    }
    clickToZoomOut(): void {
        posthog.capture("wa_click_to_zoom_out");
    }
    clickPictureInPicture(open: boolean): void {
        posthog.capture("wa_click_picture_in_picture", { open });
    }
    goToUser(): void {
        posthog.capture("wa_go_to_user");
    }
    showBusinessCard(): void {
        posthog.capture("wa_show_business_card");
    }
    reportUser(): void {
        posthog.capture("wa_report_user");
    }
    openWokaMenu(): void {
        posthog.capture("wa_open_woka_menu");
    }

    recordingStart(): void {
        posthog.capture("wa_recording_start");
    }

    recordingStop(): void {
        posthog.capture("wa_recording_stop");
    }

    openedRecordingList(): void {
        posthog.capture("wa_opened_recording_list");
    }

    /** Web app install prompt analytics */
    pwaInstallPromptShown(isIos: boolean): void {
        posthog.capture("wa_pwa_install_prompt_shown", { isIos });
    }

    pwaInstallClick(): void {
        posthog.capture("wa_pwa_install_click");
    }

    pwaContinueInBrowserClick(): void {
        posthog.capture("wa_pwa_continue_in_browser_click");
    }

    pwaInstallOutcome(outcome: "accepted" | "dismissed"): void {
        posthog.capture("wa_pwa_install_outcome", { outcome });
    }
    pwaInstallFromProfileMenuClick(): void {
        posthog.capture("wa_pwa_install_from_profile_menu_click");
    }
}
export const analyticsClient = new AnalyticsClient();
