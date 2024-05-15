<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { Color } from "@workadventure/shared-utils";
    import { fly } from "svelte/transition";
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
    import { gameManager } from "../Phaser/Game/GameManager";
    import { heightCamWrapper } from "../Stores/EmbedScreensStore";
    import SoundMeterWidget from "./SoundMeterWidget.svelte";
    import { srcObject } from "./Video/utils";
    import Woka from "./Woka/WokaFromUserId.svelte";
    import loaderImg from "./images/loader.svg";
    import silentImg from "./images/silent-zone.gif";

    import MicOffIcon from "./Icons/MicOffIcon.svelte";

    let stream: MediaStream | null;
    let userName = gameManager.getPlayerName();
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
    export let small = false;

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

    // function addStyleSpeaker() {
    //     let test = document.getElementsByClassName("test")
    //     if ($mediaStreamConstraintsStore.audio) {
    //         test
    //     }
    // }
</script>

<div
    class="transition-all relative h-full test aspect-video w-fit m-auto {$mediaStreamConstraintsStore.audio
        ? 'border-8 border-solid bg-indigo-400 rounded-lg'
        : ''}"
    bind:this={cameraContainer}
    style={small ? "width:100%" : "height:" + $heightCamWrapper + "px;"}
>
    <!--If we are in a silent zone-->
    {#if $silentStore}
        <div
            class="z-[250] rounded-lg py-4 px-3 text-white border-[1px] border-solid border-danger flex flex-col items-center content-center justify-between media-box-camera-off-size bg-no-repeat bg-center bg-danger-1000/70 backdrop-blur rounded-xl text-center -translate-y-8"
        >
            <div class="flex flex-col -mt-20 leading-3">
                <img src={silentImg} alt="Silent emoji" class="h-40 w-40" />
            </div>
            <div class="m-0 text-center -mt-4 text-lg bold">
                {$LL.camera.my.silentZone()}
            </div>
            <div class="text-danger-400 text-xs">
                {$LL.camera.my.silentZoneDesc()}
            </div>
        </div>

        <!--If we have a video to display-->
    {:else if $localStreamStore.type === "success" && !$inExternalServiceStore}
        {#if $requestedCameraState && $mediaStreamConstraintsStore.video}
            <div
                class="absolute bottom-4 left-4 z-30 {small ? 'hidden' : ''}"
                transition:fly={{ delay: 50, y: 50, duration: 150 }}
            >
                <div class="flex">
                    <span class="rounded bg-contrast/90 backdrop-blur px-4 py-1 text-white text-sm pl-12 pr-4 bold">
                        <div class="absolute left-1 -top-1" style="image-rendering:pixelated">
                            <Woka
                                userId={-1}
                                placeholderSrc={""}
                                customHeight="42&& !$cameraEnergySavingStorepx"
                                customWidth="42px"
                            />
                        </div>
                        {$LL.camera.my.nameTag()}
                    </span>
                </div>
            </div>

            <div
                class="aspect-video w-full absolute top-0 left-0 overflow-hidden z-20 rounded-lg transition-all bg-no-repeat bg-center bg-contrast/80 backdrop-blur"
                style="background-image: url({loaderImg})"
                transition:fly={{ y: 50, duration: 150 }}
            >
                <div class="text-white/50 text-xxs absolute w-full h-6 left-0 text-center top-0 -bottom-20 m-auto z-10">
                    {$LL.camera.my.loading()}
                </div>
                <video
                    class="h-full w-full rounded-lg md:object-cover relative z-20"
                    class:object-contain={stream}
                    class:max-h-[230px]={stream}
                    style="-webkit-transform: scaleX(-1);transform: scaleX(-1);"
                    use:srcObject={stream}
                    autoplay
                    muted
                    playsinline
                />
                <div
                    class="z-[251] absolute aspect-ratio right-4 w-8 p-1 flex items-center justify-center {small
                        ? 'hidden'
                        : ''} {$mediaStreamConstraintsStore.audio ? 'bottom-5' : 'bottom-3'}"
                >
                    {#if $mediaStreamConstraintsStore.audio}
                        <SoundMeterWidget volume={$localVolumeStore} classcss="absolute" barColor="white" />
                    {:else}
                        <MicOffIcon />
                    {/if}
                </div>
            </div>
            <!-- If we do not have a video to display-->
        {:else if !$requestedCameraState && !$cameraEnergySavingStore}
            <div
                class="w-full rounded-lg px-3 flex flex-row items-center bg-contrast/80 backdrop-blur media-box-camera-off-size h-12"
            >
                <div class="grow">
                    <span class="rounded bg-contrast/90 backdrop-blur px-4 py-1 text-white text-sm pl-12 pr-4 bold">
                        <div class="absolute left-1 -top-1" style="image-rendering:pixelated">
                            <Woka
                                userId={-1}
                                placeholderSrc={""}
                                customHeight="42&& !$cameraEnergySavingStorepx"
                                customWidth="42px"
                            />
                        </div>
                        {$LL.camera.my.nameTag()}
                    </span>
                </div>
                {#if $mediaStreamConstraintsStore.audio}
                    <SoundMeterWidget
                        volume={$localVolumeStore}
                        classcss="voice-meter-cam-off relative mr-0 ml-auto translate-x-0 transition-transform"
                        barColor={textColor}
                    />
                {:else}
                    <div>
                        <MicOffIcon />
                    </div>
                {/if}
            </div>
        {/if}
    {/if}
</div>

<style lang="scss">
    @import "../style/breakpoints.scss";

    .width {
        width: 350px;
    }
</style>
