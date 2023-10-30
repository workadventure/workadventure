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
    import loaderImg from "./images/loader.svg";

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

<div class="transition-all self-end relative aspect-video w-[350px]" bind:this={cameraContainer}>
    <!--If we are in a silent zone-->
    {#if $silentStore}
        <div
            class="z-[250] rounded-lg py-4 px-3 text-white border-[1px] border-solid border-danger flex flex-col items-center content-center justify-between media-box-camera-off-size bg-no-repeat bg-center bg-danger-1000/70 backdrop-blur rounded-xl text-center -translate-y-8">
            <div class="flex flex-col text-[88px] -translate-y-7 leading-3">
                🤐
            </div>
            <div class="m-0 text-center pt-4 text-lg bold">
                {$LL.camera.my.silentZone()}
            </div>
            <div class="opacity-60 font-xs">
                Ex quibusdam doloremque nihil. Sint odio tempora eveniet.
            </div>
        </div>

        <!--If we have a video to display-->
    {:else if $localStreamStore.type === "success" && !$inExternalServiceStore}
        {#if $requestedCameraState && $mediaStreamConstraintsStore.video}
            <div class="absolute bottom-4 left-4 z-30">
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

            <div class="aspect-video w-full absolute top-0 left-0 overflow-hidden z-20 rounded-lg transition-all bg-no-repeat bg-center bg-contrast/80 backdrop-blur rounded-xl" style="background-image: url({loaderImg})">
                <div class="text-white/50 text-xxs absolute w-full h-6 left-0 text-center top-0 -bottom-20 m-auto z-10">
                    {$LL.camera.my.loading()}
                </div>
                <video
                    class="h-full w-full rounded md:object-cover relative z-20"
                    use:srcObject={stream}
                    autoplay
                    muted
                    playsinline
                ></video>
                <div class="z-[251] absolute aspect-ratio right-4 w-8 bottom-5 p-1 flex items-center justify-center">
                    {#if $mediaStreamConstraintsStore.audio}
                        <SoundMeterWidget volume={$localVolumeStore} classcss="absolute" barColor="white" />
                    {:else}
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1.375 2.375L21.625 22.625" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M8.125 4.625C8.125 3.72989 8.48058 2.87145 9.11351 2.23851C9.74645 1.60558 10.6049 1.25 11.5 1.25C12.3951 1.25 13.2536 1.60558 13.8865 2.23851C14.5194 2.87145 14.875 3.72989 14.875 4.625V10.25C14.875 10.5832 14.8258 10.9145 14.7287 11.2332M12.4788 13.4832C11.9744 13.6361 11.4412 13.6687 10.922 13.5784C10.4028 13.4882 9.9119 13.2776 9.4887 12.9635C9.06549 12.6494 8.72171 12.2406 8.48491 11.7698C8.2481 11.299 8.12484 10.7793 8.125 10.2522V9.12725" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M3.625 10.25C3.62475 11.6713 4.00915 13.0661 4.73742 14.2866C5.46568 15.5071 6.51068 16.5077 7.76159 17.1824C9.01249 17.8571 10.4227 18.1807 11.8426 18.1189C13.2625 18.0571 14.6392 17.6121 15.8267 16.8313M18.0767 14.5813C18.9248 13.2961 19.3756 11.78ƒbtn)97 19.3727 10.25" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M7 22.625H16" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M11.5 18.125V22.625" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    {/if}
                </div>
            </div>
            <!-- If we do not have a video to display-->
        {:else if !$requestedCameraState && !$cameraEnergySavingStore}
            <div class="w-full rounded-lg px-3 flex flex-row items-center bg-contrast/80 backdrop-blur media-box-camera-off-size h-12">
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
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1.375 2.375L21.625 22.625" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M8.125 4.625C8.125 3.72989 8.48058 2.87145 9.11351 2.23851C9.74645 1.60558 10.6049 1.25 11.5 1.25C12.3951 1.25 13.2536 1.60558 13.8865 2.23851C14.5194 2.87145 14.875 3.72989 14.875 4.625V10.25C14.875 10.5832 14.8258 10.9145 14.7287 11.2332M12.4788 13.4832C11.9744 13.6361 11.4412 13.6687 10.922 13.5784C10.4028 13.4882 9.9119 13.2776 9.4887 12.9635C9.06549 12.6494 8.72171 12.2406 8.48491 11.7698C8.2481 11.299 8.12484 10.7793 8.125 10.2522V9.12725" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M3.625 10.25C3.62475 11.6713 4.00915 13.0661 4.73742 14.2866C5.46568 15.5071 6.51068 16.5077 7.76159 17.1824C9.01249 17.8571 10.4227 18.1807 11.8426 18.1189C13.2625 18.0571 14.6392 17.6121 15.8267 16.8313M18.0767 14.5813C18.9248 13.2961 19.3756 11.78ƒbtn)97 19.3727 10.25" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M7 22.625H16" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M11.5 18.125V22.625" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                {/if}
            </div>
        {/if}
    {/if}
</div>

<style lang="scss">
    @import "../style/breakpoints.scss";
</style>
