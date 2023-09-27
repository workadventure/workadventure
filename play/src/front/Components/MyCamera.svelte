<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { Color } from "@workadventure/shared-utils";
    import {
        cameraEnergySavingStore,
        localVolumeStore,
        mediaStreamConstraintsStore,
        requestedCameraState,
        silentStore,
        localStreamStore,
    } from "../Stores/MediaStore";
    import { LL } from "../../i18n/i18n-svelte";
    import { inExternalServiceStore } from "../Stores/MyMediaStore";
    import { localUserStore } from "../Connection/LocalUserStore";
    import SoundMeterWidget from "./SoundMeterWidget.svelte";
    import { srcObject } from "./Video/utils";
    import Woka from "./Woka/WokaFromUserId.svelte";
    import microphoneOffImg from "./images/microphone-off.png";
    import cameraOffImg from "./images/camera-off.png";

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

    let cameraContainer: HTMLDivElement;

    onDestroy(() => {
        unsubscribeLocalStreamStore();
    });

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

<div class="transition-all self-end" bind:this={cameraContainer}>
    <!--If we are in a silent zone-->
    {#if $silentStore}
        <div
            class="z-[250] h-12 bg-dark-blue rounded py-4 px-3 text-pop-red border-2 border-solid border-pop-red flex flex-row items-center content-center justify-between media-box-camera-off-size"
        >
            <div class="flex flex-row">
                <img draggable="false" src={microphoneOffImg} class="p-1 h-8 w-8" alt="Mute" />
                <img draggable="false" src={cameraOffImg} class="p-1 h-8 w-8" alt="Mute" />
            </div>
            <p class="m-0 text-center pr-1">{$LL.camera.my.silentZone()}</p>
        </div>

        <!--If we have a video to display-->
    {:else if $localStreamStore.type === "success" && !$inExternalServiceStore}
        {#if $requestedCameraState && $mediaStreamConstraintsStore.video}
            <div
                class="nametag-webcam-container container-end media-box-camera-on-size video-on-responsive-height z-[251]"
            >
                <i class="flex">
                    <span
                        style="background-color: {backgroundColor}; color: {textColor};"
                        class="nametag-text nametag-shape pr-3 pl-5 h-4 max-h-8">{$LL.camera.my.nameTag()}</span
                    >
                </i>
            </div>
            <div class="woka-webcam-container container-end video-on-responsive-height pb-1 z-[251]">
                <div class="flex">
                    <Woka
                        userId={-1}
                        placeholderSrc={""}
                        customHeight="20&& !$cameraEnergySavingStorepx"
                        customWidth="20px"
                    />
                </div>
            </div>
            <div class="my-webcam-container z-[250] bg-dark-blue/50 rounded transition-all">
                <video
                    class="h-full w-full rounded md:object-cover"
                    style="-webkit-transform: scaleX(-1);transform: scaleX(-1);"
                    use:srcObject={stream}
                    autoplay
                    muted
                    playsinline
                />

                <div class="voice-meter-my-container justify-end z-[251] pr-2 absolute">
                    {#if $mediaStreamConstraintsStore.audio}
                        <SoundMeterWidget volume={$localVolumeStore} classcss="absolute" barColor="blue" />
                    {:else}
                        <img draggable="false" src={microphoneOffImg} class="flex p-1 h-8 w-8" alt="Mute" />
                    {/if}
                </div>
            </div>
            <!-- If we do not have a video to display-->
        {:else if !$requestedCameraState && !$cameraEnergySavingStore}
            <div
                style="background-color: {backgroundColor}; color: {textColor}"
                class="w-full rounded px-3 flex flex-row items-center media-box-camera-off-size h-12"
            >
                <Woka userId={-1} placeholderSrc={""} customHeight="32px" customWidth="32px" />
                <span class="font-semibold text-sm not-italic break-words px-2 overflow-y-auto max-h-10"
                    >{$LL.camera.my.nameTag()}</span
                >
                {#if $mediaStreamConstraintsStore.audio}
                    <SoundMeterWidget
                        volume={$localVolumeStore}
                        classcss="voice-meter-cam-off relative mr-0 ml-auto translate-x-0 transition-transform"
                        barColor={textColor}
                    />
                {:else}
                    <img
                        draggable="false"
                        src={microphoneOffImg}
                        class="flex p-1 h-8 w-8 voice-meter-cam-off relative mr-0 ml-auto translate-x-0 transition-transform"
                        alt="Mute"
                        class:brightness-0={textColor === "black"}
                        class:brightness-100={textColor === "white"}
                    />
                {/if}
            </div>
        {/if}
    {/if}
</div>

<style lang="scss">
    @import "../style/breakpoints.scss";
</style>
