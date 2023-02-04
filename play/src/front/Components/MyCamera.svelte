<script lang="ts">
    import {
        cameraEnergySavingStore,
        localVolumeStore,
        mediaStreamConstraintsStore,
        requestedCameraState,
        silentStore,
    } from "../Stores/MediaStore";
    import { localStreamStore } from "../Stores/MediaStore";
    import SoundMeterWidget from "./SoundMeterWidget.svelte";
    import { onDestroy, onMount } from "svelte";
    import { srcObject } from "./Video/utils";
    import { Color } from "@workadventure/shared-utils";
    import LL from "../../i18n/i18n-svelte";
    import Woka from "./Woka/Woka.svelte";
    import { localUserStore } from "../Connexion/LocalUserStore";
    import microphoneOffImg from "./images/microphone-off.png";
    import cameraOffImg from "./images/camera-off.png";
    import { inExternalServiceStore } from "../Stores/MyMediaStore";
    import { megaphoneEnabledStore } from "../Stores/MegaphoneStore";

    let stream: MediaStream | null;
    let userName = localUserStore.getName();
    let backgroundColor = Color.getColorByString(userName ?? "default");
    let textColor = Color.getTextColorByBackgroundColor(backgroundColor);

    const unsubscribeLocalStreamStore = localStreamStore.subscribe((value) => {
        if (value.type === "success") {
            stream = value.stream;
        } else {
            stream = null;
        }
    });

    onDestroy(() => {
        unsubscribeLocalStreamStore();
    });

    let cameraContainer: HTMLDivElement;

    onMount(() => {
        cameraContainer.addEventListener("transitionend", () => {
            if (cameraContainer.classList.contains("hide")) {
                cameraContainer.style.visibility = "hidden";
            }
        });

        cameraContainer.addEventListener("transitionstart", () => {
            if (!cameraContainer.classList.contains("hide")) {
                cameraContainer.style.visibility = "visible";
            }
        });
    });
</script>

<div class="tw-transition-all tw-self-end" bind:this={cameraContainer}>
    <!--If we are in a silent zone-->
    {#if $silentStore}
        <div
            class="tw-z-[250] tw-h-12 tw-bg-dark-blue tw-rounded tw-py-4 tw-px-3 tw-text-pop-red tw-border-2 tw-border-solid tw-border-pop-red tw-flex tw-flex-row tw-items-center tw-content-center tw-justify-between media-box-camera-off-size"
        >
            <div class="tw-flex tw-flex-row">
                <img draggable="false" src={microphoneOffImg} class="tw-p-1 tw-h-8 tw-w-8" alt="Mute" />
                <img draggable="false" src={cameraOffImg} class="tw-p-1 tw-h-8 tw-w-8" alt="Mute" />
            </div>
            <p class="tw-m-0 tw-text-center tw-pr-1">{$LL.camera.my.silentZone()}</p>
        </div>

        <!--If we have a video to display-->
    {:else if $localStreamStore.type === "success" && !$inExternalServiceStore}
        {#if $requestedCameraState && $mediaStreamConstraintsStore.video}
            <div
                class="nametag-webcam-container container-end media-box-camera-on-size video-on-responsive-height tw-z-[251]"
            >
                <i class="tw-flex">
                    <span
                        style="background-color: {backgroundColor}; color: {textColor};"
                        class="nametag-text nametag-shape tw-pr-3 tw-pl-5 tw-h-4 tw-max-h-8"
                        >{$LL.camera.my.nameTag()}</span
                    >
                </i>
            </div>
            <div class="woka-webcam-container container-end video-on-responsive-height tw-pb-1 tw-z-[251]">
                <div class="tw-flex">
                    <Woka
                        userId={-1}
                        placeholderSrc={""}
                        customHeight="20&& !$cameraEnergySavingStorepx"
                        customWidth="20px"
                    />
                </div>
            </div>
            <div class="my-webcam-container tw-z-[250] tw-bg-dark-blue/50 tw-rounded tw-transition-all">
                <video
                    class="tw-h-full tw-w-full tw-rounded md:tw-object-cover {$megaphoneEnabledStore
                        ? 'tw-border-orange tw-border-3 tw-border-solid'
                        : ''}"
                    style="-webkit-transform: scaleX(-1);transform: scaleX(-1);"
                    use:srcObject={stream}
                    autoplay
                    muted
                    playsinline
                />

                <div class="voice-meter-my-container tw-justify-end tw-z-[251] tw-pr-2 tw-absolute">
                    {#if $mediaStreamConstraintsStore.audio}
                        <SoundMeterWidget volume={$localVolumeStore} classcss="tw-absolute" barColor="blue" />
                    {:else}
                        <img draggable="false" src={microphoneOffImg} class="tw-flex tw-p-1 tw-h-8 tw-w-8" alt="Mute" />
                    {/if}
                </div>
            </div>
            <!-- If we do not have a video to display-->
        {:else if !$requestedCameraState && !$cameraEnergySavingStore}
            <div
                style="background-color: {backgroundColor}; color: {textColor}"
                class="tw-w-full tw-rounded tw-px-3 tw-flex tw-flex-row tw-items-center media-box-camera-off-size tw-h-12"
            >
                <Woka userId={-1} placeholderSrc={""} customHeight="32px" customWidth="32px" />
                <span
                    class="tw-font-semibold tw-text-sm tw-not-italic tw-break-words tw-px-2 tw-overflow-y-auto tw-max-h-10"
                    >{$LL.camera.my.nameTag()}</span
                >
                {#if $mediaStreamConstraintsStore.audio}
                    <SoundMeterWidget
                        volume={$localVolumeStore}
                        classcss="voice-meter-cam-off tw-relative tw-mr-0 tw-ml-auto tw-translate-x-0 tw-transition-transform"
                        barColor={textColor}
                    />
                {:else}
                    <img
                        draggable="false"
                        src={microphoneOffImg}
                        class="tw-flex tw-p-1 tw-h-8 tw-w-8 voice-meter-cam-off tw-relative tw-mr-0 tw-ml-auto tw-translate-x-0 tw-transition-transform"
                        alt="Mute"
                        class:tw-brightness-0={textColor === "black"}
                        class:tw-brightness-100={textColor === "white"}
                    />
                {/if}
            </div>
        {/if}
    {/if}
</div>

<style lang="scss">
    @import "../style/breakpoints.scss";
</style>
