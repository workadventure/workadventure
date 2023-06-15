<script lang="ts">
    import { fly } from "svelte/transition";
    import { onDestroy, onMount } from "svelte";
    import { CheckIcon } from "svelte-feather-icons";
    import { modalIframeStore } from "../../Stores/ModalStore";
    import { isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
    import {
        megaphoneEnabledStore,
        requestedMegaphoneStore,
        streamingMegaphoneStore,
    } from "../../Stores/MegaphoneStore";
    import { srcObject } from "../Video/utils";
    import {
        batchGetUserMediaStore,
        cameraListStore,
        cameraNoEnergySavingStore,
        localStreamStore,
        microphoneListStore,
        requestedCameraDeviceIdStore,
        requestedCameraState,
        requestedMicrophoneDeviceIdStore,
        requestedMicrophoneState,
        usedCameraDeviceIdStore,
        usedMicrophoneDeviceIdStore,
    } from "../../Stores/MediaStore";
    import { StringUtils } from "../../Utils/StringUtils";
    import { myCameraStore, myMicrophoneStore } from "../../Stores/MyMediaStore";
    import cinemaCloseImg from "../images/no-video.svg";
    import { LL } from "../../../i18n/i18n-svelte";
    import { analyticsClient } from "../../Administration/AnalyticsClient";

    let mainMegaphone: HTMLDivElement;

    function close() {
        streamingMegaphoneStore.set(false);
        cameraNoEnergySavingStore.set(false);
    }

    function start() {
        requestedMegaphoneStore.set(true);
        close();
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            close();
        }
    }

    function selectCamera(deviceId: string) {
        requestedCameraDeviceIdStore.set(deviceId);
    }

    function selectMicrophone(deviceId: string) {
        requestedMicrophoneDeviceIdStore.set(deviceId);
    }

    onMount(() => {
        batchGetUserMediaStore.startBatch();
        myCameraStore.set(true);
        myMicrophoneStore.set(true);
        requestedCameraState.enableWebcam();
        requestedMicrophoneState.enableMicrophone();
        cameraNoEnergySavingStore.set(true);
        batchGetUserMediaStore.commitChanges();
        resizeObserver.observe(mainMegaphone);
    });

    onDestroy(() => {
        streamingMegaphoneStore.set(false);
        cameraNoEnergySavingStore.set(false);
    });

    let isMobile = isMediaBreakpointUp("md");
    const resizeObserver = new ResizeObserver(() => {
        isMobile = isMediaBreakpointUp("md");
    });
</script>

<svelte:window on:keydown={onKeyDown} />

<div
    class="menu-container tw-w-fit tw-h-fit {isMobile ? 'mobile' : $modalIframeStore?.position}"
    bind:this={mainMegaphone}
>
    <div
        class="tw-px-40 tw-py-20 tw-w-full tw-bg-dark-purple/95 tw-rounded"
        transition:fly={{ x: 1000, duration: 500 }}
    >
        <button type="button" class="close-window" on:click={close}>&times</button>

        <div class="tw-flex tw-flex-col tw-justify-center tw-items-center tw-h-full">
            <div class="tw-z-[250] tw-bg-dark-blue/50 tw-rounded-3xl tw-transition-all tw-w-96 tw-h-fit">
                {#if $usedCameraDeviceIdStore && $localStreamStore.type === "success" && $localStreamStore.stream}
                    <video
                        class="tw-h-full tw-w-full tw-rounded-3xl md:tw-object-cover -tw-scale-x-100 {$megaphoneEnabledStore
                            ? 'tw-border-orange tw-border-3 tw-border-solid'
                            : ''}"
                        use:srcObject={$localStreamStore.stream}
                        autoplay
                        muted
                        playsinline
                    />
                {:else}
                    <div class="webrtcsetup tw-rounded-md tw-h-56 tw-gap-x-56 tw-flex tw-justify-center">
                        <img class="background-img tw-h-full" src={cinemaCloseImg} alt="" />
                    </div>
                {/if}
            </div>

            <div class="tw-mt-20 tw-flex tw-flex-col tw-w-96">
                <label for="megaphone-camera">{$LL.megaphone.modal.selectCamera()}</label>
                <select id="megaphone-camera">
                    {#each $cameraListStore as camera}
                        <option
                            class="wa-dropdown-item"
                            on:click={() => {
                                //analyticsClient.selectMicrophone();
                            }}
                            on:click|stopPropagation|preventDefault={() => selectCamera(camera.deviceId)}
                        >
                            {StringUtils.normalizeDeviceName(camera.label)}
                            {#if $usedCameraDeviceIdStore === camera.deviceId}
                                <CheckIcon size="13" />
                            {/if}
                        </option>
                    {/each}
                </select>
            </div>

            <div class="tw-mt-5 tw-flex tw-flex-col tw-w-96">
                <label for="megaphone-microphone">{$LL.megaphone.modal.selectMicrophone()}</label>
                <select id="megaphone-microphone">
                    {#each $microphoneListStore as microphone}
                        <option
                            class="wa-dropdown-item"
                            on:click={() => {
                                //analyticsClient.selectMicrophone();
                            }}
                            on:click|stopPropagation|preventDefault={() => selectMicrophone(microphone.deviceId)}
                        >
                            {StringUtils.normalizeDeviceName(microphone.label)}
                            {#if $usedMicrophoneDeviceIdStore === microphone.deviceId}
                                <CheckIcon size="13" />
                            {/if}
                        </option>
                    {/each}
                </select>
            </div>

            <div class="tw-mt-20 tw-flex tw-flex-col">
                <button
                    type="button"
                    id="start_megaphone"
                    class="light tw-m-auto tw-cursor-pointer tw-px-3 {!$requestedCameraState ||
                    !$requestedMicrophoneState
                        ? 'disabled'
                        : ''}"
                    disabled={!$requestedCameraState || !$requestedMicrophoneState}
                    on:click={() => {
                        analyticsClient.startMegaphone();
                    }}
                    on:click={start}
                >
                    {$LL.megaphone.modal.startMegaphone()}
                </button>
            </div>
        </div>
    </div>
</div>

<style lang="scss">
    .menu-container {
        &.mobile {
            width: 100% !important;
            height: 100% !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
        }
    }
</style>
