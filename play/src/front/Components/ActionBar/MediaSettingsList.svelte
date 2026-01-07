<script lang="ts">
    import { fly } from "svelte/transition";
    import { clickOutside } from "svelte-outside";
    import { createEventDispatcher, onDestroy } from "svelte";
    import {
        cameraListStore,
        localStreamStore,
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
        inBackgroundSettingsStore,
    } from "../../Stores/MediaStore";

    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { StringUtils } from "../../Utils/StringUtils";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { IconCamera, IconMicrophoneOn, IconHeadphones, IconCheck, IconCancel } from "@wa-icons";
    import { srcObject } from "../Video/utils";
    import { backgroundConfigStore, backgroundPresets } from "../../Stores/BackgroundTransformStore";
    import type { BackgroundMode } from "../../WebRtc/BackgroundProcessor/createBackgroundTransformer";

    export let mediaSettingsDisplayed = false;

    let mode : "settings" | "background" = "settings";

    $: inBackgroundSettingsStore.set(mode === "background");

    onDestroy(() => {
        inBackgroundSettingsStore.set(false);
    });


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

    function microphoneClick(): void {
        if ($silentStore) return;
        if ($requestedMicrophoneState === true) {
            requestedMicrophoneState.disableMicrophone();
        } else {
            requestedMicrophoneState.enableMicrophone();
        }
    }

    const blurOptions = [
        { labelKey: "blurSmall" as const, amount: 10 , blurTailwind: 'blur-[2px]' },
        { labelKey: "blurMiddle" as const, amount: 25, blurTailwind: 'blur-[6px]' },
        { labelKey: "blurHigh" as const, amount: 50, blurTailwind: 'blur-[12px]' },
    ];

    function setBackgroundMode(newMode: BackgroundMode) {
        backgroundConfigStore.setMode(newMode);
    }

    function setBackgroundBlur(amount: number) {
        backgroundConfigStore.setMode("blur");
        backgroundConfigStore.setBlurAmount(amount);
    }

    function setBackgroundImage(imageUrl: string) {
        backgroundConfigStore.setBackgroundImage(imageUrl);
    }

    function setBackgroundVideo(videoUrl: string) {
        backgroundConfigStore.setBackgroundVideo(videoUrl);
    }
</script>

<div
    class="absolute pb-2 top-20 bottom-auto mobile:top-auto mobile:bottom-20 start-1/2 transform -translate-x-1/2 text-white rounded-md w-64 overflow-hidden before:content-[''] before:absolute before:w-full before:h-full before:z-1 before:start-0 before:top-0 before:rounded-lg before:bg-contrast/80 before:backdrop-blur after:content-[''] after:absolute after:z-0 after:w-full after:bg-transparent after:h-full after:-top-4 after:-start-0 transition-all"
    in:fly={{ y: 40, duration: 150 }}
    use:clickOutside={() => dispatch("close")}
>

    <div class="flex flex-col overflow-auto gap-2 p-1" style="max-height: calc(100vh - 160px);">
        <div class="flex flex-row gap-2 px-1">
            <div class="flex-1 flex text-xxs uppercase text-white/50 pb-0.5 pt-1 relative bold">
                <div class="group flex items-center relative z-10 w-full">
                    <button
                        class="btn btn-sm btn-ghost btn-light justify-center w-full rounded text-nowrap {mode === 'settings' ? '!bg-white/10' : ''}"
                        on:click={()=>{
                            mode = "settings";
                        }}
                    >
                        {$LL.actionbar.background.settings()}
                    </button>
                </div>
            </div>
            <div class="flex-1 flex text-xxs uppercase text-white/50 pb-0.5 pt-1 relative bold">
                <div class="group flex items-center relative z-10 w-full">
                    <button
                        class="btn btn-sm btn-ghost btn-light justify-center w-full rounded text-nowrap {mode === 'background' ? '!bg-white/10' : ''}"
                        on:click={()=>{
                            mode = "background";
                        }}
                    >
                        {$LL.actionbar.background.cameraBackground()}
                    </button>
                </div>
            </div>
        </div>

        {#if mode === "settings"}
        <div class="flex flex-col gap-1">
            <div class="flex text-xxs uppercase text-white/50 px-2 pb-0.5 pt-1 relative bold">
                {$LL.actionbar.subtitle.camera()}
            </div>
            {#if $silentStore == false && $requestedCameraState && $cameraListStore && $cameraListStore.length > 0}
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
        <div class="w-full z-10 flex items-center">
            <div class="bg-white/10 w-full h-[1px]" />
        </div>
        <div class="flex flex-col gap-1">
            <div class="flex text-xxs uppercase text-white/50 px-2 pb-0.5 pt-1 relative bold">
                {$LL.actionbar.subtitle.microphone()}
            </div>
        {#if $silentStore == false && $requestedMicrophoneState && $microphoneListStore && $microphoneListStore.length > 0}
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
        <div class="w-full z-10 flex items-center">
            <div class="bg-white/10 w-full h-[1px]" />
        </div>
        <div class="flex flex-col gap-1">
            <div class="flex text-xxs uppercase text-white/50 px-2 pb-0.5 pt-1 relative bold">
                {$LL.actionbar.subtitle.speaker()}
            </div>
        {#if $speakerSelectedStore != undefined && $speakerListStore && $speakerListStore.length > 0}
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
        {:else if mode === "background"}
        <!-- Camera Preview -->
        <div class="relative w-full aspect-video rounded-lg overflow-hidden bg-contrast/50 px-0">
            {#if $localStreamStore.type === "success" && $localStreamStore.stream}
                <video
                    class="w-full h-full object-cover scale-x-[-1]"
                    use:srcObject={$localStreamStore.stream}
                    autoplay
                    muted
                    playsinline
                />
            {:else}
                <div class="w-full h-full flex items-center justify-center text-white/50">
                    <IconCamera font-size="32" />
                </div>
            {/if}
        </div>

        <div class="w-full z-10 flex items-center py-2">
            <div class="bg-white/10 w-full h-[1px]" />
        </div>

        <!-- No Effect Button -->
        {@const isNoEffectSelected = $backgroundConfigStore.mode === "none"}
        <button
            class="relative z-10 flex flex-col gap-1 group text-left"
            on:click={() => setBackgroundMode("none")}
        >
            <div 
                class="relative w-1/3 h-full aspect-square rounded-lg bg-white/10 flex flex-col items-center justify-center transition-all gap-1 {isNoEffectSelected 
                    ? 'border-2 border-white border-solid' 
                    : 'border-2 border-transparent hover:border-white/30'}"
            >
                {#if isNoEffectSelected}
                    <IconCheck font-size="16" />
                {:else}
                    <IconCancel font-size="16" />
                {/if}
                <span class="text-xs  group-hover:text-white transition-colors ">{$LL.actionbar.background.noEffect()}</span>
            </div>
        </button>

        <!-- Blur Section -->
        <div class="relative z-10 flex flex-col gap-2 px-1">
            <div class="flex text-xxs uppercase text-white/50 px-2 pb-0.5 pt-1 relative font-bold">
                {$LL.actionbar.background.blur()}
            </div>
            <div class="grid grid-cols-3 gap-1">
                {#each blurOptions as option (option.amount)}
                    {@const isSelected = $backgroundConfigStore.mode === "blur" && $backgroundConfigStore.blurAmount === option.amount}
                    <button
                        class="flex flex-col items-center group px-0"
                        on:click={() => setBackgroundBlur(option.amount)}
                    >
                        <div 
                            class="relative w-full aspect-square rounded-sm border-2 transition-all"
                        >
                            <div class="absolute inset-0 rounded-md overflow-hidden {isSelected 
                                ? 'border-white border-solid border-2' 
                                : 'border-transparent hover:border-white/30'}">
                                <img
                                    src="/static/images/background/thumbnail/settingBackgroundEffect.jpeg"
                                    alt="Blur preview"
                                    class="w-full h-full object-cover  {option.blurTailwind}"
                                />
                            </div>
                            {#if isSelected}
                                <div class="absolute inset-0 flex items-center justify-center">
                                    <div class="inset-0 flex items-center justify-center bg-contrast/50 rounded-[6px] w-6 h-6">
                                        <IconCheck font-size="16" />
                                    </div>
                                </div>
                            {/if}
                        </div>
                        <span class="text-xs group-hover:text-white transition-colors {isSelected ? 'text-white' : 'text-white/70'}">{$LL.actionbar.background[option.labelKey]()}</span>
                    </button>
                {/each}
            </div>
        </div>

        <!-- Images Section -->
        <div class="relative z-10 flex flex-col gap-2">
            <div class="flex text-xxs uppercase text-white/50 px-2 pb-0.5 pt-1 relative font-bold">
                {$LL.actionbar.background.images()}
            </div>
            <div class="grid grid-cols-3 gap-1 px-1">
                <!-- Add Custom Image Button
                <button
                    class="w-full aspect-square rounded-sm border-2 border-dashed border-white/30 hover:border-white/50 flex items-center justify-center transition-all hover:bg-white/5"
                    on:click={() => {
                        // TODO: Implement custom image upload
                    }}
                >
                    <IconPlus font-size="24" class="text-white/50" />
                </button> -->
                {#each backgroundPresets.images as preset (preset.url)}
                    {@const isSelected = $backgroundConfigStore.mode === "image" && $backgroundConfigStore.backgroundImage === preset.url}
                    <button
                            class="relative w-full aspect-square rounded-md border-2 transition-all"
                        on:click={() => setBackgroundImage(preset.url)}
                        title={preset.name}
                    >
                        <div class="absolute inset-0 rounded-sm overflow-hidden {isSelected 
                                ? 'border-white border-solid border-2' 
                                : 'border-transparent hover:border-white/30'}">
                            <img 
                                src={preset.thumbnail} 
                                alt={preset.name} 
                                class="w-full h-full object-cover"
                            />
                        </div>
                        {#if isSelected}
                        <div class="absolute inset-0 flex items-center justify-center">
                            <div class="inset-0 flex items-center justify-center bg-contrast/50 rounded-[6px] w-6 h-6">
                                <IconCheck font-size="16" />
                            </div>
                        </div>
                        {/if}
                    </button>
                {/each}
            </div>
        </div>

        <!-- Videos Section -->
        <div class="relative z-10 flex flex-col gap-2">
            <div class="flex text-xxs uppercase text-white/50 px-2 pb-0.5 pt-1 relative font-bold">
                {$LL.actionbar.background.videos()}
            </div>
            <div class="grid grid-cols-3 gap-1 px-1">
                {#each backgroundPresets.videos as preset (preset.url)}
                    {@const isSelected = $backgroundConfigStore.mode === "video" && $backgroundConfigStore.backgroundVideo === preset.url}
                    <button
                        class="relative w-full aspect-square rounded-sm border-2 transition-all"
                        on:click={() => setBackgroundVideo(preset.url)}
                        title={preset.name}
                    >
                        <div class="absolute inset-0 rounded-sm overflow-hidden {isSelected 
                                ? 'border-white border-solid border-2' 
                                : 'border-transparent hover:border-white/30'}">
                            <img 
                                src={preset.thumbnail} 
                                alt={preset.name} 
                                class="w-full h-full object-cover"
                            />
                        </div>
                        {#if isSelected}
                        <div class="absolute inset-0 flex items-center justify-center">
                            <div class="inset-0 flex items-center justify-center bg-contrast/50 rounded-[6px] w-6 h-6">
                                <IconCheck font-size="16" />
                            </div>
                        </div>
                        {/if}
                    </button>
                {/each}
            </div>
        </div>
        {/if}
    </div>
</div>
