<script lang="ts">
    import { fly } from "svelte/transition";
    import { audioManagerFileStore, audioManagerVisibilityStore } from "../../Stores/AudioManagerStore";
    import { HtmlUtils } from "../../WebRtc/HtmlUtils";
    import { LL, locale } from "../../../i18n/i18n-svelte";
    import type { Locales } from "../../../i18n/i18n-types";
    import { displayableLocales, setCurrentLocale } from "../../../i18n/locales";
    import { gameManager } from "../../Phaser/Game/GameManager";

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
    import { volumeProximityDiscussionStore } from "../../Stores/PeerStore";
    import InputSwitch from "../Input/InputSwitch.svelte";
    import RangeSlider from "../Input/RangeSlider.svelte";

    let fullscreen: boolean = localUserStore.getFullscreen();
    let notification: boolean = localUserStore.getNotification();
    let blockAudio: boolean = localUserStore.getBlockAudio();
    let forceCowebsiteTrigger: boolean = localUserStore.getForceCowebsiteTrigger();
    let ignoreFollowRequests: boolean = localUserStore.getIgnoreFollowRequests();
    let decreaseAudioPlayerVolumeWhileTalking: boolean = localUserStore.getDecreaseAudioPlayerVolumeWhileTalking();
    let disableAnimations: boolean = localUserStore.getDisableAnimations();
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

    let volumeProximityDiscussion = localUserStore.getVolumeProximityDiscussion();

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
                document.documentElement.requestFullscreen().catch((e) => console.error(e));
            }
            localUserStore.setFullscreen(fullscreen);
        }
    }

    function changeNotification() {
        // Analytics Client
        analyticsClient.settingNotification(notification ? "true" : "false");

        if (Notification.permission === "granted") {
            localUserStore.setNotification(notification);
        } else {
            Notification.requestPermission()
                .then((response) => {
                    if (response === "granted") {
                        localUserStore.setNotification(notification);
                    } else {
                        localUserStore.setNotification(false);
                        notification = false;
                    }
                })
                .catch((e) => console.error(e));
        }
    }

    function changeBlockAudio() {
        if (blockAudio) {
            audioManagerFileStore.unloadAudio();
            audioManagerVisibilityStore.set("disabledBySettings");
        }
        localUserStore.setBlockAudio(blockAudio);
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

    function changeDisableAnimations() {
        localUserStore.setDisableAnimations(disableAnimations);
        if (disableAnimations) {
            gameManager.getCurrentGameScene().animatedTiles.pause();
        } else {
            gameManager.getCurrentGameScene().animatedTiles.resume();
        }
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

    function updateVolumeProximityDiscussion() {
        analyticsClient.settingAudioVolume();
        localUserStore.setVolumeProximityDiscussion(volumeProximityDiscussion);
        volumeProximityDiscussionStore.set(volumeProximityDiscussion);
    }
</script>

<div class="divide-y divide-white/20" transition:fly={{ x: -700, duration: 250 }}>
    <section class=" p-0 first:pt-0 pt-8 m-0">
        <div class="bg-contrast font-bold text-lg p-4 flex items-center">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="mr-4 opacity-50"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="#ffffff"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path
                    d="M12 20h-7a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v3.5"
                />
                <path d="M12 16a3 3 0 1 0 0 -6a3 3 0 0 0 0 6z" />
                <path d="M19 22v-6" />
                <path d="M22 19l-3 -3l-3 3" />
            </svg>
            {$LL.menu.settings.videoBandwidth.title()}
        </div>
        <div class="flex w-full mb-6 mt-2 pl-6">
            <div class="flex flex-col w-10/12 lg:w-6/12">
                <ul class="flex justify-between w-full px-[10px] mb-8">
                    <li
                        class="flex justify-center relative {valueVideoBandwidth === 1
                            ? 'opacity-100 font-bold'
                            : 'opacity-50 hover:opacity-80'}"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="icon icon-tabler icon-tabler-antenna-bars-1"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="#ffffff"
                            fill="none"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <path d="M6 18l0 .01" />
                            <path d="M10 18l0 .01" />
                            <path d="M14 18l0 .01" />
                            <path d="M18 18l0 .01" />
                        </svg>
                        <span
                            class="absolute -bottom-4 cursor-pointer"
                            on:click|preventDefault={() => (valueVideoBandwidth = 1)}
                            >{$LL.menu.settings.videoBandwidth.low()}</span
                        >
                    </li>
                    <li
                        class="flex justify-center relative {valueVideoBandwidth === 2
                            ? 'opacity-100 font-bold'
                            : 'opacity-50 hover:opacity-80'}"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="icon icon-tabler icon-tabler-antenna-bars-3"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="#ffffff"
                            fill="none"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <path d="M6 18l0 -3" />
                            <path d="M10 18l0 -6" />
                            <path d="M14 18l0 .01" />
                            <path d="M18 18l0 .01" />
                        </svg>
                        <span
                            class="absolute -bottom-4 cursor-pointer"
                            on:click|preventDefault={() => (valueVideoBandwidth = 2)}
                            >{$LL.menu.settings.videoBandwidth.recommended()}</span
                        >
                    </li>
                    <li
                        class="flex justify-center relative {valueVideoBandwidth === 3
                            ? 'opacity-100 font-bold'
                            : 'opacity-50 hover:opacity-80'}"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="icon icon-tabler icon-tabler-antenna-bars-5"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="#ffffff"
                            fill="none"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <path d="M6 18l0 -3" />
                            <path d="M10 18l0 -6" />
                            <path d="M14 18l0 -9" />
                            <path d="M18 18l0 -12" />
                        </svg>
                        <span
                            class="absolute -bottom-4 cursor-pointer"
                            on:click|preventDefault={() => (valueVideoBandwidth = 3)}
                            >{$LL.menu.settings.videoBandwidth.unlimited()}</span
                        >
                    </li>
                </ul>
                <RangeSlider
                    type="range"
                    class="w-full bg-pop-blue"
                    buttonShape="square"
                    min="1"
                    max="3"
                    step="1"
                    bind:value={valueVideoBandwidth}
                    on:change={updateVideoBandwidth}
                />
            </div>
        </div>
    </section>
    <section class="flex flex-col p-0 first:pt-0 pt-8 m-0">
        <div class="bg-contrast font-bold text-lg p-4 flex items-center">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="mr-4 opacity-50"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="#ffffff"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M9 2m0 3a3 3 0 0 1 3 -3h0a3 3 0 0 1 3 3v5a3 3 0 0 1 -3 3h0a3 3 0 0 1 -3 -3z" />
                <path d="M5 10a7 7 0 0 0 14 0" />
                <path d="M8 21l8 0" />
                <path d="M12 17l0 4" />
            </svg>
            {$LL.menu.settings.shareScreenBandwidth.title()}
        </div>
        <div class="flex w-full mb-6 mt-2 pl-6">
            <div class="flex flex-col w-10/12 lg:w-6/12">
                <ul class="flex justify-between w-full px-[10px] mb-8">
                    <li
                        class="flex relative {valueScreenShareBandwidth === 1
                            ? 'opacity-100 font-bold'
                            : 'opacity-50 hover:opacity-80'}"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="icon icon-tabler icon-tabler-antenna-bars-1"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="#ffffff"
                            fill="none"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <path d="M6 18l0 .01" />
                            <path d="M10 18l0 .01" />
                            <path d="M14 18l0 .01" />
                            <path d="M18 18l0 .01" />
                        </svg>
                        <span
                            class="absolute -bottom-4 cursor-pointer"
                            on:click|preventDefault={() => (valueScreenShareBandwidth = 1)}
                            >{$LL.menu.settings.shareScreenBandwidth.low()}</span
                        >
                    </li>
                    <li
                        class="flex justify-center relative {valueScreenShareBandwidth === 2
                            ? 'opacity-100 font-bold'
                            : 'opacity-50 hover:opacity-80'}"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="icon icon-tabler icon-tabler-antenna-bars-3"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="#ffffff"
                            fill="none"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <path d="M6 18l0 -3" />
                            <path d="M10 18l0 -6" />
                            <path d="M14 18l0 .01" />
                            <path d="M18 18l0 .01" />
                        </svg>
                        <span
                            class="absolute -bottom-4 cursor-pointer"
                            on:click|preventDefault={() => (valueScreenShareBandwidth = 2)}
                            >{$LL.menu.settings.shareScreenBandwidth.recommended()}</span
                        >
                    </li>
                    <li
                        class="flex justify-center relative {valueScreenShareBandwidth === 3
                            ? 'opacity-100 font-bold'
                            : 'opacity-50 hover:opacity-80'}"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="icon icon-tabler icon-tabler-antenna-bars-5"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="#ffffff"
                            fill="none"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <path d="M6 18l0 -3" />
                            <path d="M10 18l0 -6" />
                            <path d="M14 18l0 -9" />
                            <path d="M18 18l0 -12" />
                        </svg>
                        <span
                            class="absolute -bottom-4 cursor-pointer"
                            on:click|preventDefault={() => (valueScreenShareBandwidth = 3)}
                            >{$LL.menu.settings.shareScreenBandwidth.unlimited()}</span
                        >
                    </li>
                </ul>
                <RangeSlider
                    type="range"
                    class="w-full"
                    min="1"
                    max="3"
                    step="1"
                    bind:value={valueScreenShareBandwidth}
                    on:change={updateScreenShareBandwidth}
                    buttonShape="square"
                />
            </div>
        </div>

        <div class="bg-contrast font-bold text-lg p-4 flex items-center">
          

            <svg xmlns="http://www.w3.org/2000/svg" 
                class=" mr-4 opacity-50 stroke-white icon icon-tabler icon-tabler-adjustments" 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                stroke-width="1.5" 
                fill="none" 
                stroke-linecap="round" 
                stroke-linejoin="round">

                <path stroke="none" d="M0 0h24H0z" fill="none"></path>
                <path d="M4 10a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"></path>
                <path d="M6 4v4"></path>
                <path d="M6 12v8"></path>
                <path d="M10 16a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"></path>
                <path d="M12 4v10"></path>
                <path d="M12 18v2"></path>
                <path d="M16 7a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"></path>
                <path d="M18 4v1"></path>
                <path d="M18 9v11"></path>
            </svg>
            {$LL.menu.settings.proximityDiscussionVolume()}
        </div>
      
        <div class="flex w-full justify-center">
            <div class="flex flex-col w-10/12 lg:w-6/12">
                <ul class="flex justify-between w-full px-[10px] mb-5">
                    <li class="flex justify-center relative">
                        <span class="absolute">0</span>
                    </li>
                    <li class="flex justify-center relative">
                        <span class="absolute">1</span>
                    </li>
                    <li class="flex justify-center relative">
                        <span class="absolute">2</span>
                    </li>
                    <li class="flex justify-center relative">
                        <span class="absolute">3</span>
                    </li>
                    <li class="flex justify-center relative">
                        <span class="absolute">4</span>
                    </li>
                    <li class="flex justify-center relative">
                        <span class="absolute">5</span>
                    </li>
                    <li class="flex justify-center relative">
                        <span class="absolute">6</span>
                    </li>
                    <li class="flex justify-center relative">
                        <span class="absolute">7</span>
                    </li>
                    <li class="flex justify-center relative">
                        <span class="absolute">8</span>
                    </li>
                    <li class="flex justify-center relative">
                        <span class="absolute">9</span>
                    </li>
                    <li class="flex justify-center relative">
                        <span class="absolute">10</span>
                    </li>
                </ul>
                <RangeSlider
                    type="range"
                    class="w-full"
                    min="0"
                    max="10"
                    step="0.1"
                    bind:value={volumeProximityDiscussion}
                    on:change={updateVolumeProximityDiscussion}
                />
            </div>
        </div>
    </section>
    <section class="flex flex-col p-0 first:pt-0 pt-8 m-0">
        <div class="bg-contrast font-bold text-lg p-4 flex items-center">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="mr-4 opacity-50"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="#ffffff"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M4 5h7" />
                <path d="M9 3v2c0 4.418 -2.239 8 -5 8" />
                <path d="M5 9c0 2.144 2.952 3.908 6.7 4" />
                <path d="M12 20l4 -9l4 9" />
                <path d="M19.1 18h-6.2" />
            </svg>
            {$LL.menu.settings.language.title()}
        </div>
        <div class="mt-2 p-2">
            <select
                class="w-full languages-switcher bg-contrast rounded border border-solid border-white/20 mb-0 "
                bind:value={valueLocale}
                on:change={updateLocale}
            >
                {#each displayableLocales as locale (locale.id)}
                    <option value={locale.id}>
                        {`${
                            locale.language ? locale.language.charAt(0).toUpperCase() + locale.language.slice(1) : ""
                        } (${locale.region})`}
                    </option>
                {/each}
            </select>
        </div>
    </section>
    <section class="flex flex-col p-0 first:pt-0 pt-8 m-0">
        <div class="tooltip">
            <div class="group bg-contrast font-bold text-lg p-4 flex items-center relative">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="mr-4 opacity-50"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="#ffffff"
                    fill="none"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M13 12v.01" />
                    <path d="M3 21h18" />
                    <path d="M5 21v-16a2 2 0 0 1 2 -2h7.5m2.5 10.5v7.5" />
                    <path d="M14 7h7m-3 -3l3 3l-3 3" />
                </svg>
                <div class="grow">
                    <div>{$LL.menu.settings.privacySettings.title()}</div>
                    <div class="text-sm italic text-white/50">{$LL.menu.settings.privacySettings.explanation()}</div>
                </div>
            </div>
        </div>
        
        <label for="cam-toggle" class="flex cursor-pointer items-center relative m-4">
            <InputSwitch
                id="cam-toggle"
                class="peer sr-only"
                bind:checked={valueCameraPrivacySettings}
                onChange={changeCameraPrivacySettings}
                label={$LL.menu.settings.privacySettings.cameraToggle()}
            />
            
        </label>
       

        <label for="mic-toggle" class="flex cursor-pointer items-center relative m-4">
            <InputSwitch
                id="mic-toggle"
                class="peer sr-only"
                bind:checked={valueMicrophonePrivacySettings}
                onChange={changeMicrophonePrivacySettings}
                label={$LL.menu.settings.privacySettings.microphoneToggle()}
            />
           
        </label>
    </section>
    <section class="flex flex-col p-0 first:pt-0 pt-8 m-0">
        <div class="bg-contrast font-bold text-lg p-4 flex items-center">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="mr-4 opacity-50"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="#ffffff"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M4 8h4v4h-4z" />
                <path d="M6 4l0 4" />
                <path d="M6 12l0 8" />
                <path d="M10 14h4v4h-4z" />
                <path d="M12 4l0 10" />
                <path d="M12 18l0 2" />
                <path d="M16 5h4v4h-4z" />
                <path d="M18 4l0 1" />
                <path d="M18 9l0 11" />
            </svg>
            {$LL.menu.settings.otherSettings()}
        </div>

        <label for="fullscreen-toggle" class="flex cursor-pointer items-center relative m-4">
            <InputSwitch
                id="fullscreen-toggle"
                class="peer sr-only"
                bind:checked={fullscreen}
                onChange={changeFullscreen}
                label={$LL.menu.settings.fullscreen()}
            />
          
        </label>
        <label for="notification-toggle" class="flex cursor-pointer items-center relative m-4">
            <InputSwitch
                id="notification-toggle"
                class="peer sr-only"
                bind:checked={notification}
                onChange={changeNotification}
                label={$LL.menu.settings.notifications()}
            />
            
        </label>
        <label for="cowebsiteTrigger-toggle" class="flex cursor-pointer items-center relative m-4">
            <InputSwitch
                id="cowebsiteTrigger-toggle"
                class="peer sr-only"
                bind:checked={forceCowebsiteTrigger}
                onChange={changeForceCowebsiteTrigger}
                label={$LL.menu.settings.cowebsiteTrigger()}
            />
        </label>

        <label for="cowebsiteTrigger-toggle" class="flex cursor-pointer items-center relative m-4">
            <InputSwitch
                id="cowebsiteTrigger-toggle"
                class="peer sr-only"
                bind:checked={ignoreFollowRequests}
                onChange={changeIgnoreFollowRequests}
                label={$LL.menu.settings.ignoreFollowRequest()}
            />
           
        </label>
        <label for="decreaseAudioPlayerVolumeWhileTalking-toggle" class="flex cursor-pointer items-center relative m-4">
            <InputSwitch
                id="decreaseAudioPlayerVolumeWhileTalking-toggle"
                class="peer sr-only"
                bind:checked={decreaseAudioPlayerVolumeWhileTalking}
                onChange ={changeDecreaseAudioPlayerVolumeWhileTalking}
                label= {$LL.audio.manager.reduce()}
            />
        </label>
        
        <label for="changeBlockAudio" class="flex cursor-pointer items-center relative m-4">
            <InputSwitch
                id="changeBlockAudio"
                class="peer sr-only"
                bind:checked={blockAudio}
                onChange={changeBlockAudio}
                label={$LL.menu.settings.blockAudio()}
            />

        </label>

        <label for="changeDisableAnimations" class="flex cursor-pointer items-center relative m-4">
            <InputSwitch
                id="changeDisableAnimations"
                class="peer sr-only"
                bind:checked={disableAnimations}
                onChange={changeDisableAnimations}
                label={$LL.menu.settings.disableAnimations()}
            />
           
        </label>
    </section>
</div>

<style lang="scss">
</style>
