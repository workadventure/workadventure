<script lang="ts">
    import { HtmlUtils } from "../../WebRtc/HtmlUtils";
    import { LL, locale } from "../../../i18n/i18n-svelte";
    import type { Locales } from "../../../i18n/i18n-types";
    import { displayableLocales, setCurrentLocale } from "../../../i18n/locales";

    import infoImg from "../images/info.svg";
    import { iframeListener } from "../../Api/IframeListener";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import {
        PEER_SCREEN_SHARE_LOW_BANDWIDTH,
        PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH,
        PEER_VIDEO_LOW_BANDWIDTH,
        PEER_VIDEO_RECOMMENDED_BANDWIDTH,
    } from "../../Enum/EnvironmentVariable";
    import { videoBandwidthStore } from "../../Stores/MediaStore";
    import { screenShareBandwidthStore } from "../../Stores/ScreenSharingStore";

    let fullscreen: boolean = localUserStore.getFullscreen();
    let notification: boolean = localUserStore.getNotification();
    let chatSounds: boolean = localUserStore.getChatSounds();
    let forceCowebsiteTrigger: boolean = localUserStore.getForceCowebsiteTrigger();
    let ignoreFollowRequests: boolean = localUserStore.getIgnoreFollowRequests();
    let decreaseAudioPlayerVolumeWhileTalking: boolean = localUserStore.getDecreaseAudioPlayerVolumeWhileTalking();
    let valueLocale: string = $locale;
    let valueCameraPrivacySettings = localUserStore.getCameraPrivacySettings();
    let valueMicrophonePrivacySettings = localUserStore.getMicrophonePrivacySettings();
    const initialVideoBandwidth = localUserStore.getVideoBandwidth();

    let valueVideoBandwidth =
        initialVideoBandwidth === "unlimited" ? 3 : initialVideoBandwidth === PEER_VIDEO_LOW_BANDWIDTH ? 1 : 2;
    const initialScreenShareBandwidth = localUserStore.getScreenShareBandwidth();
    let valueScreenShareBandwidth =
        initialScreenShareBandwidth === "unlimited"
            ? 3
            : initialScreenShareBandwidth === PEER_SCREEN_SHARE_LOW_BANDWIDTH
            ? 1
            : 2;

    let previewCameraPrivacySettings = valueCameraPrivacySettings;
    let previewMicrophonePrivacySettings = valueMicrophonePrivacySettings;

    async function updateLocale() {
        await setCurrentLocale(valueLocale as Locales);
    }

    function updateVideoBandwidth() {
        let value: number | "unlimited";

        switch (valueVideoBandwidth) {
            case 1:
                value = PEER_VIDEO_LOW_BANDWIDTH;
                break;
            case 3:
                value = "unlimited";
                break;
            default:
                value = PEER_VIDEO_RECOMMENDED_BANDWIDTH;
                break;
        }

        videoBandwidthStore.setBandwidth(value);
    }

    function updateScreenShareBandwidth() {
        let value: number | "unlimited";

        switch (valueScreenShareBandwidth) {
            case 1:
                value = PEER_SCREEN_SHARE_LOW_BANDWIDTH;
                break;
            case 3:
                value = "unlimited";
                break;
            default:
                value = PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH;
                break;
        }

        screenShareBandwidthStore.setBandwidth(value);
    }

    function changeFullscreen() {
        // Analytics Client
        analyticsClient.settingFullscreen(fullscreen ? "true" : "false");

        const body = HtmlUtils.querySelectorOrFail("body");
        if (body) {
            if (document.fullscreenElement !== null && !fullscreen) {
                document.exitFullscreen().catch((e) => console.error(e));
            } else {
                body.requestFullscreen().catch((e) => console.error(e));
            }
            localUserStore.setFullscreen(fullscreen);
        }
    }

    function changeNotification() {
        // Analytics Client
        analyticsClient.settingNotification(notification ? "true" : "false");

        if (Notification.permission === "granted") {
            localUserStore.setNotification(notification);
            iframeListener.sendSettingsToChatIframe();
        } else {
            Notification.requestPermission()
                .then((response) => {
                    if (response === "granted") {
                        localUserStore.setNotification(notification);
                    } else {
                        localUserStore.setNotification(false);
                        notification = false;
                    }
                    iframeListener.sendSettingsToChatIframe();
                })
                .catch((e) => console.error(e));
        }
    }

    function changeChatSounds() {
        localUserStore.setChatSounds(chatSounds);
        iframeListener.sendSettingsToChatIframe();
    }

    function changeForceCowebsiteTrigger() {
        // Analytics Client
        analyticsClient.settingAskWebsite(forceCowebsiteTrigger ? "true" : "false");

        localUserStore.setForceCowebsiteTrigger(forceCowebsiteTrigger);
    }

    function changeIgnoreFollowRequests() {
        // Analytics Client
        analyticsClient.settingRequestFollow(ignoreFollowRequests ? "true" : "false");

        localUserStore.setIgnoreFollowRequests(ignoreFollowRequests);
    }

    function changeDecreaseAudioPlayerVolumeWhileTalking() {
        // Analytics Client
        analyticsClient.settingDecreaseAudioVolume(decreaseAudioPlayerVolumeWhileTalking ? "true" : "false");

        localUserStore.setDecreaseAudioPlayerVolumeWhileTalking(decreaseAudioPlayerVolumeWhileTalking);
    }

    function changeCameraPrivacySettings() {
        // Analytics Client
        analyticsClient.settingMicrophone(valueCameraPrivacySettings ? "true" : "false");

        if (valueCameraPrivacySettings !== previewCameraPrivacySettings) {
            previewCameraPrivacySettings = valueCameraPrivacySettings;
            localUserStore.setCameraPrivacySettings(valueCameraPrivacySettings);
        }
    }

    function changeMicrophonePrivacySettings() {
        // Analytics Client
        analyticsClient.settingCamera(valueMicrophonePrivacySettings ? "true" : "false");

        if (valueMicrophonePrivacySettings !== previewMicrophonePrivacySettings) {
            previewMicrophonePrivacySettings = valueMicrophonePrivacySettings;
            localUserStore.setMicrophonePrivacySettings(valueMicrophonePrivacySettings);
        }
    }
</script>

<div>
    <section class="bottom-separator">
        <h3 class="blue-title">{$LL.menu.settings.videoBandwidth.title()}</h3>
        <div class="tw-flex tw-w-full tw-justify-center">
            <div class="tw-flex tw-flex-col tw-w-10/12 lg:tw-w-6/12">
                <ul class="tw-flex tw-justify-between tw-w-full tw-px-[10px] tw-mb-5">
                    <li class="tw-flex tw-justify-center tw-relative">
                        <span class="tw-absolute">{$LL.menu.settings.videoBandwidth.low()}</span>
                    </li>
                    <li class="tw-flex tw-justify-center tw-relative">
                        <span class="tw-absolute">{$LL.menu.settings.videoBandwidth.recommended()}</span>
                    </li>
                    <li class="tw-flex tw-justify-center tw-relative">
                        <span class="tw-absolute">{$LL.menu.settings.videoBandwidth.unlimited()}</span>
                    </li>
                </ul>
                <input
                    type="range"
                    class="tw-w-full tw-bg-pop-blue"
                    min="1"
                    max="3"
                    step="1"
                    bind:value={valueVideoBandwidth}
                    on:change={updateVideoBandwidth}
                />
            </div>
        </div>

        <h3 class="blue-title">{$LL.menu.settings.shareScreenBandwidth.title()}</h3>
        <div class="tw-flex tw-w-full tw-justify-center">
            <div class="tw-flex tw-flex-col tw-w-10/12 lg:tw-w-6/12">
                <ul class="tw-flex tw-justify-between tw-w-full tw-px-[10px] tw-mb-5">
                    <li class="tw-flex tw-justify-center tw-relative">
                        <span class="tw-absolute">{$LL.menu.settings.shareScreenBandwidth.low()}</span>
                    </li>
                    <li class="tw-flex tw-justify-center tw-relative">
                        <span class="tw-absolute">{$LL.menu.settings.shareScreenBandwidth.recommended()}</span>
                    </li>
                    <li class="tw-flex tw-justify-center tw-relative">
                        <span class="tw-absolute">{$LL.menu.settings.shareScreenBandwidth.unlimited()}</span>
                    </li>
                </ul>
                <input
                    type="range"
                    class="tw-w-full"
                    min="1"
                    max="3"
                    step="1"
                    bind:value={valueScreenShareBandwidth}
                    on:change={updateScreenShareBandwidth}
                />
            </div>
        </div>

        <h3 class="blue-title">{$LL.menu.settings.language.title()}</h3>
        <select class="tw-w-full languages-switcher" bind:value={valueLocale} on:change={updateLocale}>
            {#each displayableLocales as locale (locale.id)}
                <option value={locale.id}>
                    {`${locale.language ? locale.language.charAt(0).toUpperCase() + locale.language.slice(1) : ""} (${
                        locale.region
                    })`}
                </option>
            {/each}
        </select>
    </section>
    <section class="bottom-separator tw-flex tw-flex-col">
        <div class="tooltip tw-w-fit">
            <h3 class="blue-title tw-underline tw-decoration-light-blue tw-decoration-dotted">
                {$LL.menu.settings.privacySettings.title()}
                <img draggable="false" src={infoImg} alt="info icon" width="18px" height="18px" />
            </h3>
            <span class="tooltiptext sm:tw-w-56 md:tw-w-96">{$LL.menu.settings.privacySettings.explanation()}</span>
        </div>
        <label>
            <input type="checkbox" bind:checked={valueCameraPrivacySettings} on:change={changeCameraPrivacySettings} />
            {$LL.menu.settings.privacySettings.cameraToggle()}
        </label>
        <label>
            <input
                type="checkbox"
                bind:checked={valueMicrophonePrivacySettings}
                on:change={changeMicrophonePrivacySettings}
            />
            {$LL.menu.settings.privacySettings.microphoneToggle()}
        </label>
    </section>
    <section class="tw-flex tw-flex-col">
        <h3 class="blue-title">{$LL.menu.settings.otherSettings()}</h3>
        <label>
            <input type="checkbox" bind:checked={fullscreen} on:change={changeFullscreen} />
            <span>{$LL.menu.settings.fullscreen()}</span>
        </label>
        <label>
            <input type="checkbox" bind:checked={notification} on:change={changeNotification} />
            <span>{$LL.menu.settings.notifications()}</span>
        </label>
        <label>
            <input type="checkbox" bind:checked={chatSounds} on:change={changeChatSounds} />
            <span>{$LL.menu.settings.chatSounds()}</span>
        </label>
        <label>
            <input type="checkbox" bind:checked={forceCowebsiteTrigger} on:change={changeForceCowebsiteTrigger} />
            <span>{$LL.menu.settings.cowebsiteTrigger()}</span>
        </label>
        <label>
            <input type="checkbox" bind:checked={ignoreFollowRequests} on:change={changeIgnoreFollowRequests} />
            <span>{$LL.menu.settings.ignoreFollowRequest()}</span>
        </label>
        <label>
            <input
                type="checkbox"
                bind:checked={decreaseAudioPlayerVolumeWhileTalking}
                on:change={changeDecreaseAudioPlayerVolumeWhileTalking}
            />
            <span>{$LL.audio.manager.reduce()}</span>
        </label>
    </section>
</div>

<style lang="scss">
</style>
