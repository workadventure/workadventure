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
        cameraAccessIssueStore,
        microphoneAccessIssueStore,
        devicesNotLoaded,
        rawLocalStreamStore,
        mediaStreamConstraintsStore,
    } from "../../../Stores/MediaStore";
    import { cameraPermissionStateStore, microphonePermissionStateStore } from "../../../Stores/MediaStatusStore";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import { LL } from "../../../../i18n/i18n-svelte";
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

    $: cameraDenied =
        $cameraPermissionStateStore === "denied" ||
        ($cameraAccessIssueStore === "permission_denied" && $cameraPermissionStateStore !== "granted");
    $: microphoneDenied =
        $microphonePermissionStateStore === "denied" ||
        ($microphoneAccessIssueStore === "permission_denied" && $microphonePermissionStateStore !== "granted");

    $: cameraLoaded =
        ($rawLocalStreamStore.type === "success" &&
            $rawLocalStreamStore.stream &&
            $rawLocalStreamStore.stream.getVideoTracks().length > 0) ||
        ($requestedCameraState && $usedCameraDeviceIdStore !== undefined);
    $: microphoneLoaded =
        ($rawLocalStreamStore.type === "success" &&
            $rawLocalStreamStore.stream &&
            $rawLocalStreamStore.stream.getAudioTracks().length > 0) ||
        ($requestedMicrophoneState && $usedMicrophoneDeviceIdStore !== undefined);
</script>

<div class="scrollable-content overflow-y-auto flex flex-col gap-2 flex-1 min-h-0">
    <!-- Camera Section -->
    <div class="flex flex-col gap-1">
        <SectionTitle title={$LL.actionbar.subtitle.camera()} />
        {#if $silentStore == false && cameraLoaded && $cameraListStore && $cameraListStore.length > 0}
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
                    {#if cameraDenied}
                        <p class="text-sm p-0 m-0">{$LL.camera.help.tooltip.permissionDeniedTitle()}</p>
                    {:else if $cameraAccessIssueStore === "no_device" || (!$devicesNotLoaded && $cameraListStore !== undefined && $cameraListStore.length === 0)}
                        <p class="text-sm p-0 m-0">{$LL.camera.help.tooltip.noDeviceDesc()}</p>
                        <span class="text-xs text-white/55">{$LL.camera.help.tooltip.noDeviceDesc()}</span>
                    {:else if $cameraPermissionStateStore === "prompt" && !$requestedCameraState}
                        <p class="text-sm p-0 m-0">{$LL.camera.help.title()}</p>
                        <span class="text-xs text-white/55">{$LL.camera.help.content()}</span>
                    {:else if !$mediaStreamConstraintsStore.video !== false || !$requestedCameraState}
                        <p class="text-sm p-0 m-0">{$LL.actionbar.camera.disabled()}</p>
                    {:else if $rawLocalStreamStore.type === "error"}
                        <p class="text-sm p-0 m-0">{$LL.login.genericError()}</p>
                    {:else}
                        <p class="text-sm p-0 m-0">{$LL.chat.loading()}...</p>
                    {/if}
                </div>
            </div>
            {#if $silentStore == false}
                <div class="group flex items-center relative z-10 py-1 px-2 overflow-hidden">
                    {#if cameraDenied}
                        <button class="btn btn-danger btn-sm w-full justify-center" on:click={showHelpCameraSettings}>
                            {$LL.actionbar.microphone.openSettings()}
                        </button>
                    {:else}
                        <button
                            class="btn btn-danger btn-sm w-full justify-center"
                            on:click={() => {
                                analyticsClient.camera();
                                cameraClick();
                            }}
                        >
                            {$LL.actionbar.camera.activate()}
                        </button>
                    {/if}
                </div>
            {/if}
        {/if}
    </div>

    <SectionDivider />

    <!-- Microphone Section -->
    <div class="flex flex-col gap-1">
        <SectionTitle title={$LL.actionbar.subtitle.microphone()} />
        {#if $silentStore == false && microphoneLoaded && $microphoneListStore && $microphoneListStore.length > 0}
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
                    {#if microphoneDenied}
                        <p class="text-sm p-0 m-0">{$LL.camera.help.microphoneTooltip.permissionDeniedTitle()}</p>
                    {:else if $microphoneAccessIssueStore === "no_device" || (!$devicesNotLoaded && $microphoneListStore !== undefined && $microphoneListStore.length === 0)}
                        <p class="text-sm p-0 m-0">{$LL.camera.help.microphoneTooltip.noDeviceTitle()}</p>
                        <span class="text-xs text-white/55">{$LL.camera.help.microphoneTooltip.noDeviceDesc()}</span>
                    {:else if $microphonePermissionStateStore === "prompt" && !$requestedMicrophoneState}
                        <p class="text-sm p-0 m-0">{$LL.camera.help.title()}</p>
                        <span class="text-xs text-white/55">{$LL.camera.help.content()}</span>
                    {:else if $mediaStreamConstraintsStore.audio === false || !$requestedMicrophoneState}
                        <p class="text-sm p-0 m-0">{$LL.actionbar.microphone.disabled()}</p>
                    {:else if $rawLocalStreamStore.type === "error"}
                        <p class="text-sm p-0 m-0">{$LL.login.genericError()}</p>
                    {:else}
                        <p class="text-sm p-0 m-0">{$LL.chat.loading()}...</p>
                    {/if}
                </div>
            </div>
            {#if $silentStore == false}
                <div class="group flex items-center relative z-10 py-1 px-2 overflow-hidden">
                    {#if microphoneDenied}
                        <button class="btn btn-danger btn-sm w-full justify-center" on:click={showHelpCameraSettings}>
                            {$LL.actionbar.microphone.openSettings()}
                        </button>
                    {:else}
                        <button
                            class="btn btn-danger btn-sm w-full justify-center"
                            on:click={() => {
                                analyticsClient.microphone();
                                microphoneClick();
                            }}
                        >
                            {$LL.actionbar.microphone.activate()}
                        </button>
                    {/if}
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
