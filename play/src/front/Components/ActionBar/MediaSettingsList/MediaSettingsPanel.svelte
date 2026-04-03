<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import {
        cameraListStore,
        microphoneListStore,
        requestedCameraDeviceIdStore,
        requestedCameraState,
        requestedMicrophoneDeviceIdStore,
        requestedMicrophoneState,
        speakerListStore,
        speakerSelectedStore,
        silentStore,
        usedCameraDeviceIdStore,
        usedMicrophoneDeviceIdStore,
    } from "../../../Stores/MediaStore";
    import { localCameraStatusStore, localMicrophoneStatusStore } from "../../../Stores/MediaStatusStore";
    import type { LocalMediaTrackStatus } from "../../../Stores/MediaStatus";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import type { TranslationFunctions } from "../../../../i18n/i18n-types";
    import { showHelpCameraSettings } from "../../../Stores/HelpSettingsStore";
    import SectionDivider from "./SectionDivider.svelte";
    import SectionTitle from "./SectionTitle.svelte";
    import DeviceListItem from "./DeviceListItem.svelte";
    import { IconCamera, IconMicrophoneOn, IconHeadphones } from "@wa-icons";

    const dispatch = createEventDispatcher<{
        cameraSelected: void;
    }>();

    function selectCamera(deviceId: string) {
        requestedCameraDeviceIdStore.set(deviceId);
        localUserStore.setPreferredVideoInputDevice(deviceId);
        dispatch("cameraSelected");
    }

    function selectMicrophone(deviceId: string) {
        requestedMicrophoneDeviceIdStore.set(deviceId);
        localUserStore.setPreferredAudioInputDevice(deviceId);
    }

    function selectSpeaker(deviceId: string) {
        localUserStore.setSpeakerDeviceId(deviceId);
        speakerSelectedStore.set(deviceId);
    }

    function cameraClick(): void {
        if ($silentStore) return;
        if ($requestedCameraState === true) {
            requestedCameraState.disableWebcam();
        } else {
            requestedCameraState.enableWebcam();
        }
    }

    function microphoneClick(): void {
        if ($silentStore) return;
        if ($requestedMicrophoneState === true) {
            requestedMicrophoneState.disableMicrophone();
        } else {
            requestedMicrophoneState.enableMicrophone();
        }
    }

    function getCameraStatusMessage(
        $LL: TranslationFunctions,
        status: LocalMediaTrackStatus
    ): {
        title: string;
        description?: string;
    } {
        switch (status) {
            case "permission_needed":
                return {
                    title: $LL.camera.help.title(),
                    description: $LL.camera.help.content(),
                };
            case "denied":
                return {
                    title: $LL.camera.help.tooltip.permissionDeniedTitle(),
                };
            case "no_device":
                return {
                    title: $LL.camera.help.tooltip.noDeviceTitle(),
                    description: $LL.camera.help.tooltip.noDeviceDesc(),
                };
            case "loading":
                return {
                    title: $LL.camera.my.loading(),
                };
            default:
                return {
                    title: $LL.actionbar.camera.disabled(),
                };
        }
    }

    function getMicrophoneStatusMessage(
        $LL: TranslationFunctions,
        status: LocalMediaTrackStatus
    ): {
        title: string;
        description?: string;
    } {
        switch (status) {
            case "permission_needed":
                return {
                    title: $LL.camera.help.title(),
                    description: $LL.camera.help.content(),
                };
            case "denied":
                return {
                    title: $LL.camera.help.microphoneTooltip.permissionDeniedTitle(),
                };
            case "no_device":
                return {
                    title: $LL.camera.help.microphoneTooltip.noDeviceTitle(),
                    description: $LL.camera.help.microphoneTooltip.noDeviceDesc(),
                };
            case "loading":
                return {
                    title: `${$LL.chat.loading()}...`,
                };
            default:
                return {
                    title: $LL.actionbar.microphone.disabled(),
                };
        }
    }

    function getCameraStatusAction(
        $LL: TranslationFunctions,
        status: LocalMediaTrackStatus
    ): { label: string; onClick: () => void } | null {
        if (status === "loading" || status === "loaded") {
            return null;
        }

        if (status === "denied") {
            return {
                label: $LL.actionbar.microphone.openSettings(),
                onClick: () => showHelpCameraSettings(),
            };
        }
        return {
            label: $LL.actionbar.camera.activate(),
            onClick: () => {
                analyticsClient.camera();
                cameraClick();
            },
        };
    }

    function getMicrophoneStatusAction(
        $LL: TranslationFunctions,
        status: LocalMediaTrackStatus
    ): { label: string; onClick: () => void } | null {
        if (status === "loading" || status === "loaded") {
            return null;
        }

        if (status === "denied") {
            return {
                label: $LL.actionbar.microphone.openSettings(),
                onClick: () => showHelpCameraSettings(),
            };
        }
        return {
            label: $LL.actionbar.microphone.activate(),
            onClick: () => {
                analyticsClient.microphone();
                microphoneClick();
            },
        };
    }

    $: cameraMessage = getCameraStatusMessage($LL, $localCameraStatusStore);
    $: microphoneMessage = getMicrophoneStatusMessage($LL, $localMicrophoneStatusStore);
    $: cameraAction = getCameraStatusAction($LL, $localCameraStatusStore);
    $: microphoneAction = getMicrophoneStatusAction($LL, $localMicrophoneStatusStore);
</script>

<div class="scrollable-content overflow-y-auto flex flex-col gap-2 flex-1 min-h-0">
    <!-- Camera Section -->
    <div class="flex flex-col gap-1">
        <SectionTitle title={$LL.actionbar.subtitle.camera()} />
        {#if $silentStore == false && $localCameraStatusStore === "loaded" && $cameraListStore && $cameraListStore.length > 0}
            {#each $cameraListStore as camera, index (index)}
                <DeviceListItem
                    label={camera.label}
                    isSelected={$usedCameraDeviceIdStore === camera.deviceId}
                    icon={IconCamera}
                    onClick={() => {
                        analyticsClient.selectCamera();
                        selectCamera(camera.deviceId);
                    }}
                />
            {/each}
        {:else}
            <div class="group flex items-center relative z-10 px-2 font-sm justify-center">
                <div class="text-sm italic text-center">
                    <p class="text-sm p-0 m-0">{cameraMessage.title}</p>
                    {#if cameraMessage.description}
                        <span class="text-xs text-white/55">{cameraMessage.description}</span>
                    {/if}
                </div>
            </div>
            {#if $silentStore == false && cameraAction}
                <div class="group flex items-center relative z-10 py-1 px-2 overflow-hidden">
                    <button class="btn btn-danger btn-sm w-full justify-center" on:click={cameraAction.onClick}>
                        {cameraAction.label}
                    </button>
                </div>
            {/if}
        {/if}
    </div>

    <SectionDivider />

    <!-- Microphone Section -->
    <div class="flex flex-col gap-1">
        <SectionTitle title={$LL.actionbar.subtitle.microphone()} />
        {#if $silentStore == false && $localMicrophoneStatusStore === "loaded" && $microphoneListStore && $microphoneListStore.length > 0}
            {#each $microphoneListStore as microphone, index (index)}
                <DeviceListItem
                    label={microphone.label}
                    isSelected={$usedMicrophoneDeviceIdStore === microphone.deviceId}
                    icon={IconMicrophoneOn}
                    onClick={() => {
                        analyticsClient.selectMicrophone();
                        selectMicrophone(microphone.deviceId);
                    }}
                />
            {/each}
        {:else}
            <div class="group flex items-center relative z-10 py-1 px-2 font-sm justify-center">
                <div class="text-sm italic text-center">
                    <p class="text-sm p-0 m-0">{microphoneMessage.title}</p>
                    {#if microphoneMessage.description}
                        <span class="text-xs text-white/55">{microphoneMessage.description}</span>
                    {/if}
                </div>
            </div>
            {#if $silentStore == false && microphoneAction}
                <div class="group flex items-center relative z-10 px-2 overflow-hidden">
                    <button class="btn btn-danger btn-sm w-full justify-center" on:click={microphoneAction.onClick}>
                        {microphoneAction.label}
                    </button>
                </div>
            {/if}
        {/if}
    </div>

    <SectionDivider />

    <!-- Speaker Section -->
    <div class="flex flex-col gap-1">
        <SectionTitle title={$LL.actionbar.subtitle.speaker()} />
        {#if $speakerSelectedStore != undefined && $speakerListStore && $speakerListStore.length > 0}
            {#each $speakerListStore as speaker, index (index)}
                <DeviceListItem
                    label={speaker.label}
                    isSelected={$speakerSelectedStore === speaker.deviceId}
                    icon={IconHeadphones}
                    onClick={() => {
                        analyticsClient.selectSpeaker();
                        selectSpeaker(speaker.deviceId);
                    }}
                />
            {/each}
        {:else if $speakerListStore !== undefined}
            <div class="cursor-pointer group flex items-center relative z-10 py-1 px-2 font-sm justify-center">
                <div class="text-sm italic text-center">
                    {#if $speakerListStore.length === 0}
                        <p class="text-sm p-0 m-0">{$LL.actionbar.speaker.noDevices()}</p>
                        <span class="text-xs text-white/55">{$LL.actionbar.speaker.noDevicesDesc()}</span>
                    {:else}
                        {$LL.actionbar.speaker.disabled()}
                    {/if}
                </div>
            </div>
        {/if}
    </div>
</div>
