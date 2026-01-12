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
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import { LL } from "../../../../i18n/i18n-svelte";
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
</script>

<div class="scrollable-content overflow-y-auto flex flex-col gap-2 flex-1 min-h-0">
    <!-- Camera Section -->
    <div class="flex flex-col gap-1">
        <SectionTitle title={$LL.actionbar.subtitle.camera()} />
        {#if $silentStore == false && $requestedCameraState && $cameraListStore && $cameraListStore.length > 0}
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
                <div class="text-sm italic">
                    {#if $cameraListStore == undefined || $cameraListStore.length == 0}
                        {$LL.actionbar.camera.noDevices()}
                    {:else}
                        {$LL.actionbar.camera.disabled()}
                    {/if}
                </div>
            </div>
            {#if $silentStore == false && $requestedCameraState == false}
                <div class="group flex items-center relative z-10 py-1 px-2 overflow-hidden">
                    <button
                        class="btn btn-danger btn-sm w-full justify-center"
                        on:click={() => analyticsClient.camera()}
                        on:click={cameraClick}
                    >
                        {$LL.actionbar.camera.activate()}
                    </button>
                </div>
            {/if}
        {/if}
    </div>

    <SectionDivider />

    <!-- Microphone Section -->
    <div class="flex flex-col gap-1">
        <SectionTitle title={$LL.actionbar.subtitle.microphone()} />
        {#if $silentStore == false && $requestedMicrophoneState && $microphoneListStore && $microphoneListStore.length > 0}
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
            <div class="cursor-pointer group flex items-center relative z-10 py-1 px-2 font-sm justify-center">
                <div class="text-sm italic">
                    {#if $microphoneListStore == undefined || $microphoneListStore.length == 0}
                        {$LL.actionbar.microphone.noDevices()}
                    {:else}
                        {$LL.actionbar.microphone.disabled()}
                    {/if}
                </div>
            </div>
            {#if $silentStore == false && $requestedMicrophoneState == false}
                <div class="group flex items-center relative z-10 px-2 overflow-hidden">
                    <button
                        class="btn btn-danger btn-sm w-full justify-center"
                        on:click={() => analyticsClient.microphone()}
                        on:click={microphoneClick}
                    >
                        {$LL.actionbar.microphone.activate()}
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
                <div class="text-sm italic">
                    {#if $speakerListStore.length === 0}
                        {$LL.actionbar.speaker.noDevices()}
                    {:else}
                        {$LL.actionbar.speaker.disabled()}
                    {/if}
                </div>
            </div>
        {/if}
    </div>
</div>
