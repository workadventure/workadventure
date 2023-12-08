import type { PostHog } from "posthog-js";
import { POSTHOG_API_KEY, POSTHOG_URL } from "../Enum/EnvironmentVariable";
import { Emoji } from "../Stores/Utils/emojiSchema";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare let window: any;

class AnalyticsClient {
    private posthogPromise: Promise<PostHog> | undefined;

    constructor() {
        const postHogApiKey = POSTHOG_API_KEY;
        if (postHogApiKey && POSTHOG_URL) {
            this.posthogPromise = import("posthog-js").then(({ default: posthog }) => {
                posthog.init(postHogApiKey, { api_host: POSTHOG_URL });
                //the posthog toolbar need a reference in window to be able to work
                window.posthog = posthog;
                return posthog;
            });
        }
    }

    identifyUser(uuid: string, email: string | null): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.identify(uuid, { uuid, email, wa: true });
            })
            .catch((e) => console.error(e));
    }

    loggedWithSso(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-logged-sso");
            })
            .catch((e) => console.error(e));
    }

    loggedWithToken(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-logged-token");
            })
            .catch((e) => console.error(e));
    }

    enteredRoom(roomId: string, roomGroup: string | null): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("$pageView", { roomId, roomGroup });
                posthog.capture("enteredRoom");
            })
            .catch((e) => console.error(e));
    }

    openedMenu(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-opened-menu");
            })
            .catch((e) => console.error(e));
    }

    launchEmote(emote: Emoji): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-emote-launch", { ...emote });
            })
            .catch((e) => console.error(e));
    }

    editEmote(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-emote-edit");
            })
            .catch((e) => console.error(e));
    }

    openBackOffice(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-opened-bo");
            })
            .catch((e) => console.error(e));
    }

    clickOnCustomButton(id: string, label?: string, toolTip?: string, imageSrc?: string) {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-custom-button", { id, label, toolTip, imageSrc });
            })
            .catch((e) => console.error(e));
    }

    enteredJitsi(roomName: string, roomId: string): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-entered-jitsi", { roomName, roomId });
            })
            .catch((e) => console.error(e));
    }

    validationName(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-name-validation");
            })
            .catch((e) => console.error(e));
    }

    validationWoka(scene: string): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-woka-validation", { scene });
            })
            .catch((e) => console.error(e));
    }

    validationVideo(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-video-validation");
            })
            .catch((e) => console.error(e));
    }

    /** New feature analytics **/
    openedChat(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-opened-chat");
            })
            .catch((e) => console.error(e));
    }

    openInvite(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-opened-invite");
            })
            .catch((e) => console.error(e));
    }

    lockDiscussion(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_lockroom");
            })
            .catch((e) => console.error(e));
    }

    screenSharing(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-screensharing");
            })
            .catch((e) => console.error(e));
    }

    follow(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_follow");
            })
            .catch((e) => console.error(e));
    }

    camera(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_camera");
            })
            .catch((e) => console.error(e));
    }

    microphone(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_microphone");
            })
            .catch((e) => console.error(e));
    }

    selectCamera(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_select_camera");
            })
            .catch((e) => console.error(e));
    }

    selectMicrophone(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_select_microphone");
            })
            .catch((e) => console.error(e));
    }

    selectSpeaker(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_select_speaker");
            })
            .catch((e) => console.error(e));
    }

    settingMicrophone(value: string): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_setting_microphone", {
                    checkbox: value,
                });
            })
            .catch((e) => console.error(e));
    }

    settingCamera(value: string): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_setting_camera", {
                    checkbox: value,
                });
            })
            .catch((e) => console.error(e));
    }

    settingNotification(value: string): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_setting_notification", {
                    checkbox: value,
                });
            })
            .catch((e) => console.error(e));
    }

    settingFullscreen(value: string): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_setting_fullscreen", {
                    checkbox: value,
                });
            })
            .catch((e) => console.error(e));
    }

    settingAskWebsite(value: string): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_setting_ask_website", {
                    checkbox: value,
                });
            })
            .catch((e) => console.error(e));
    }

    settingRequestFollow(value: string): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_setting_request_follow", {
                    checkbox: value,
                });
            })
            .catch((e) => console.error(e));
    }

    settingDecreaseAudioVolume(value: string): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_setting_decrease_audio_volume", {
                    checkbox: value,
                });
            })
            .catch((e) => console.error(e));
    }

    login(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_login");
            })
            .catch((e) => console.error(e));
    }

    logout(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_logout");
            })
            .catch((e) => console.error(e));
    }

    switchMultiIframe(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_multiiframe_switch");
            })
            .catch((e) => console.error(e));
    }

    openedWebsite(url: URL): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_opened_website", { url: url.toString() });
            })
            .catch((e) => console.error(e));
    }

    closeMultiIframe(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_multiiframe_close");
            })
            .catch((e) => console.error(e));
    }

    fullScreenMultiIframe(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_multiiframe_fullscreen");
            })
            .catch((e) => console.error(e));
    }

    stackOpenCloseMultiIframe(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_multiiframe_stack_open_close");
            })
            .catch((e) => console.error(e));
    }

    menuCredit(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_menu_credit");
            })
            .catch((e) => console.error(e));
    }

    menuProfile(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_menu_profile");
            })
            .catch((e) => console.error(e));
    }

    menuSetting() {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_menu_setting");
            })
            .catch((e) => console.error(e));
    }

    menuInvite(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_menu_invite");
            })
            .catch((e) => console.error(e));
    }

    globalMessage(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_menu_globalmessage");
            })
            .catch((e) => console.error(e));
    }

    reportIssue(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_menu_report");
            })
            .catch((e) => console.error(e));
    }

    menuContact(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_menu_contact");
            })
            .catch((e) => console.error(e));
    }

    inviteCopyLink(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_menu_invite_copylink");
            })
            .catch((e) => console.error(e));
    }

    inviteCopyLinkWalk(value: string): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_menu_invite_copylink_walk", {
                    checkbox: value,
                });
            })
            .catch((e) => console.error(e));
    }

    editCompanion(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_edit_companion");
            })
            .catch((e) => console.error(e));
    }

    editCamera(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_edit_camera");
            })
            .catch((e) => console.error(e));
    }

    editName(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_edit_name");
            })
            .catch((e) => console.error(e));
    }

    editWoka(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_edit_woka");
            })
            .catch((e) => console.error(e));
    }

    selectWoka(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_wokascene_select");
            })
            .catch((e) => console.error(e));
    }

    selectCustomWoka(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_wokascene_custom");
            })
            .catch((e) => console.error(e));
    }

    layoutPresentChange(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_layout_present");
            })
            .catch((e) => console.error(e));
    }

    addNewParticipant(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_spontaneous_discussion");
            })
            .catch((e) => console.error(e));
    }

    openMegaphone(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_action_megaphone");
            })
            .catch((e) => console.error(e));
    }

    startMegaphone(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_start_megaphone");
            })
            .catch((e) => console.error(e));
    }

    stopMegaphone(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa_stop_megaphone");
            })
            .catch((e) => console.error(e));
    }

    toggleMapEditor(open: boolean): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture(`wa_mapeditor_${open ? "open" : "close"}`);
            })
            .catch((e) => console.error(e));
    }

    addMapEditorProperty(type: string, propertyName: string): void {
        this.posthogPromise
            ?.then((posthog) => {
                // 8 decembre 2023: this event is not used anymore
                // posthog.capture(`wa_map-editor_${type}_add_${propertyName}_property`);
                posthog.capture(`wa_map-editor_add_property`, {
                    name: propertyName,
                    type,
                });
            })
            .catch((e) => console.error(e));
    }

    removeMapEditorProperty(type: string, propertyName: string): void {
        this.posthogPromise
            ?.then((posthog) => {
                // 8 decembre 2023: this event is not used anymore
                // posthog.capture(`wa_map-editor_${type}_remove_${propertyName}_property`);
                posthog.capture(`wa_map-editor_remove_property`, {
                    name: propertyName,
                    type,
                });
            })
            .catch((e) => console.error(e));
    }

    openMapEditorTool(toolName: string): void {
        this.posthogPromise
            ?.then((posthog) => {
                // 8 decembre 2023: this event is not used anymore
                // posthog.capture(`wa_map-editor_open_${toolName}`);
                posthog.capture(`wa_map-editor_open_tool`, {
                    name: toolName,
                });
            })
            .catch((e) => console.error(e));
    }

    clicPropertykMapEditor(name: string, style?: string): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture(`wa_map-editor_click_property`, {
                    name,
                    style,
                });
            })
            .catch((e) => console.error(e));
    }

    enterAreaMapEditor(id: string, name: string): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture(`wa_map-editor_enter_area`, {
                    id,
                    name,
                });
            })
            .catch((e) => console.error(e));
    }

    leaveAreaMapEditor(id: string, name: string): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture(`wa_map-editor_leaver_area`, {
                    id,
                    name,
                });
            })
            .catch((e) => console.error(e));
    }

    turnTestSuccess(protocol: string | null): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture(`wa_turn_test_success`, { protocol });
            })
            .catch((e) => console.error(e));
    }

    turnTestFailure(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture(`wa_turn_test_failure`);
            })
            .catch((e) => console.error(e));
    }
    turnTestTimeout(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture(`wa_turn_test_timeout`);
            })
            .catch((e) => console.error(e));
    }

    noVideoStreamReceived(): void {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture(`wa_no_video_stream_received`);
            })
            .catch((e) => console.error(e));
    }
}
export const analyticsClient = new AnalyticsClient();
