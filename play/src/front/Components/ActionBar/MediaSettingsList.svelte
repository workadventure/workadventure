<script lang="ts">
    import { fly } from "svelte/transition";
    import { clickOutside } from "svelte-outside";
    import { createEventDispatcher } from "svelte";
    import { EnableCameraScene, EnableCameraSceneName } from "../../Phaser/Login/EnableCameraScene";
    import {
        cameraListStore,
        enableCameraSceneVisibilityStore,
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
    } from "../../Stores/MediaStore";

    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { StringUtils } from "../../Utils/StringUtils";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { LL } from "../../../i18n/i18n-svelte";
    import PopUpBackgroundCamera from "../PopUp/PopUpBackgroundCamera.svelte";
    import { popupStore } from "../../Stores/PopupStore";
    import { IconCamera, IconMicrophoneOn, IconHeadphones, IconCheck } from "@wa-icons";

    export let mediaSettingsDisplayed = false;

    const dispatch = createEventDispatcher<{
        close: void;
    }>();

    function selectCamera(deviceId: string) {
        requestedCameraDeviceIdStore.set(deviceId);
        localUserStore.setPreferredVideoInputDevice(deviceId);
        mediaSettingsDisplayed = false;
    }

    function selectMicrophone(deviceId: string) {
        requestedMicrophoneDeviceIdStore.set(deviceId);
        localUserStore.setPreferredAudioInputDevice(deviceId);
        //microphoneActive = false;
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

    function openEnableCameraScene() {
        enableCameraSceneVisibilityStore.showEnableCameraScene();
        gameManager.leaveGame(EnableCameraSceneName, new EnableCameraScene());
    }

    function microphoneClick(): void {
        if ($silentStore) return;
        if ($requestedMicrophoneState === true) {
            requestedMicrophoneState.disableMicrophone();
        } else {
            requestedMicrophoneState.enableMicrophone();
        }
    }

    function openBackgroundSettings() {
        const actionId = "backgroundCamera";
        popupStore.addPopup(PopUpBackgroundCamera, {}, actionId);
        analyticsClient.openBackgroundSettings();
        dispatch("close");
    }
</script>

<div
    class="absolute top-20 bottom-auto mobile:top-auto mobile:bottom-20 start-1/2 transform -translate-x-1/2 text-white rounded-md w-64 overflow-hidden before:content-[''] before:absolute before:w-full before:h-full before:z-1 before:start-0 before:top-0 before:rounded-lg before:bg-contrast/80 before:backdrop-blur after:content-[''] after:absolute after:z-0 after:w-full after:bg-transparent after:h-full after:-top-4 after:-start-0 transition-all"
    in:fly={{ y: 40, duration: 150 }}
    use:clickOutside={() => dispatch("close")}
>
    <div class="flex flex-col overflow-auto gap-2 p-1" style="max-height: calc(100vh - 160px);">
        {#if $silentStore == false && $requestedCameraState && $cameraListStore && $cameraListStore.length > 0}
            <div class="flex flex-col gap-1">
                <div class="flex text-xxs uppercase text-white/50 px-2 pb-0.5 pt-1 relative bold">
                    {$LL.actionbar.subtitle.camera()}
                </div>
                {#each $cameraListStore as camera, index (index)}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div
                        class="cursor-pointer group flex items-center relative z-10 p-1 overflow-hidden rounded {$usedCameraDeviceIdStore ===
                        camera.deviceId
                            ? 'bg-secondary'
                            : 'hover:bg-white/10'}"
                        on:click|stopPropagation|preventDefault={() => {
                            analyticsClient.selectCamera();
                            selectCamera(camera.deviceId);
                        }}
                    >
                        {#if $usedCameraDeviceIdStore === camera.deviceId}
                            <div class="h-full aspect-square flex items-center justify-center rounded-md me-2">
                                <IconCamera font-size="20" fillColor="fill-white" />
                            </div>
                        {/if}

                        <div
                            class="grow text-sm text-ellipsis overflow-hidden whitespace-nowrap {$usedCameraDeviceIdStore ===
                            camera.deviceId
                                ? 'opacity-100'
                                : 'opacity-80 group-hover:opacity-100'}"
                            title={StringUtils.normalizeDeviceName(camera.label)}
                        >
                            {StringUtils.normalizeDeviceName(camera.label)}
                        </div>
                        {#if $usedCameraDeviceIdStore === camera.deviceId}
                            <IconCheck font-size="20" />
                        {/if}
                    </div>
                {/each}
            </div>
            <div class="group flex items-center relative z-10 px-2">
                <button
                    class="btn btn-sm btn-ghost btn-light justify-center w-full rounded text-nowrap"
                    on:click={() => analyticsClient.microphone()}
                    on:click={openBackgroundSettings}
                >
                    {$LL.actionbar.camera.setBackground()}
                </button>
            </div>
        {:else}
            <div class="">
                <div class="flex text-xxs uppercase text-white/50 px-2 pb-0.5 pt-2 relative bold">
                    {$LL.actionbar.subtitle.camera()}
                </div>
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
            </div>
        {/if}
        <div class="w-full z-10 flex items-center">
            <div class="bg-white/10 w-full h-[1px]" />
        </div>
        {#if $silentStore == false && $requestedMicrophoneState && $microphoneListStore && $microphoneListStore.length > 0}
            <div class="flex flex-col gap-1">
                <div class="flex text-xxs uppercase text-white/50 px-2 pb-0.5 pt-1 relative bold">
                    {$LL.actionbar.subtitle.microphone()}
                </div>
                {#each $microphoneListStore as microphone, index (index)}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div
                        class="cursor-pointer group flex items-center relative z-10 p-1 overflow-hidden rounded {$usedMicrophoneDeviceIdStore ===
                        microphone.deviceId
                            ? 'bg-secondary'
                            : 'hover:bg-white/10'}"
                        on:click={() => {
                            analyticsClient.selectMicrophone();
                        }}
                        on:click|stopPropagation|preventDefault={() => selectMicrophone(microphone.deviceId)}
                    >
                        {#if $usedMicrophoneDeviceIdStore === microphone.deviceId}
                            <div class="h-full aspect-square flex items-center justify-center rounded-md me-2">
                                <IconMicrophoneOn font-size="20" hover="fill-white" />
                            </div>
                        {/if}
                        <div
                            class="grow text-sm text-ellipsis overflow-hidden whitespace-nowrap {$usedMicrophoneDeviceIdStore ===
                            microphone.deviceId
                                ? 'opacity-100'
                                : 'opacity-80 group-hover:opacity-100'}"
                        >
                            {StringUtils.normalizeDeviceName(microphone.label)}
                        </div>
                        {#if $usedMicrophoneDeviceIdStore === microphone.deviceId}
                            <IconCheck font-size="20" />
                        {/if}
                    </div>
                {/each}
            </div>
        {:else}
            <div class="flex flex-col gap-1">
                <div class="flex text-xxs uppercase text-white/50 px-2 pb-0.5 pt-1 relative bold">
                    {$LL.actionbar.subtitle.microphone()}
                </div>
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
            </div>
        {/if}
        <div class="w-full z-10 flex items-center">
            <div class="bg-white/10 w-full h-[1px]" />
        </div>
        {#if $speakerSelectedStore != undefined && $speakerListStore && $speakerListStore.length > 0}
            <div class="flex flex-col gap-1">
                <div class="flex text-xxs uppercase text-white/50 px-2 pb-0.5 pt-1 relative bold">
                    {$LL.actionbar.subtitle.speaker()}
                </div>
                {#each $speakerListStore as speaker, index (index)}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div
                        class="cursor-pointer group flex items-center relative z-10 py-1 px-2 overflow-hidden rounded {$speakerSelectedStore ===
                        speaker.deviceId
                            ? 'bg-secondary'
                            : 'hover:bg-white/10'}"
                        on:click={() => {
                            analyticsClient.selectSpeaker();
                        }}
                        on:click|stopPropagation|preventDefault={() => selectSpeaker(speaker.deviceId)}
                    >
                        {#if $speakerSelectedStore === speaker.deviceId}
                            <div class="h-full aspect-square flex items-center justify-center rounded-md me-2">
                                <IconHeadphones font-size="20" hover="fill-white" />
                            </div>
                        {/if}
                        <div
                            class="grow text-sm text-ellipsis overflow-hidden whitespace-nowrap {$speakerSelectedStore ===
                            speaker.deviceId
                                ? 'opacity-100'
                                : 'opacity-80 group-hover:opacity-100'}"
                        >
                            {StringUtils.normalizeDeviceName(speaker.label)}
                        </div>
                        {#if $speakerSelectedStore === speaker.deviceId}
                            <IconCheck font-size="20" />
                        {/if}
                    </div>
                {/each}
            </div>
        {:else if $speakerListStore !== undefined}
            <div class="flex flex-col gap-1">
                <div class="flex text-xxs uppercase text-white/50 px-2 pb-0.5 pt-1 relative bold">
                    {$LL.actionbar.subtitle.speaker()}
                </div>
                <div class="cursor-pointer group flex items-center relative z-10 py-1 px-2 font-sm justify-center">
                    <div class="text-sm italic">
                        {#if $speakerListStore.length === 0}
                            {$LL.actionbar.speaker.noDevices()}
                        {:else}
                            {$LL.actionbar.speaker.disabled()}
                        {/if}
                    </div>
                </div>
            </div>
        {/if}
    </div>
    <div class="relative z-10 flex gap-2 p-2 bg-contrast/50">
        <button
            class="btn btn-sm btn-ghost btn-light justify-center w-full rounded text-nowrap"
            on:click={openEnableCameraScene}>{$LL.actionbar.test()}</button
        >
        <button
            class="btn btn-sm btn-border btn-light justify-center w-full cursor-pointer rounded"
            on:click|stopPropagation|preventDefault={() => dispatch("close")}
        >
            {$LL.actionbar.close()}
        </button>
    </div>
</div>
