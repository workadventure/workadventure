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

<div class="transition-all self-end relative" bind:this={cameraContainer}>
    <!--If we are in a silent zone-->
    {#if $silentStore}
        <div
            class="z-[250] h-12 rounded py-4 px-3 text-pop-red border-2 border-solid border-pop-red flex flex-row items-center content-center justify-between media-box-camera-off-size bg-no-repeat bg-center bg-contrast/80 backdrop-blur rounded-xl">
            <div class="flex flex-row">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1.375 2.375L21.625 22.625" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M8.125 4.625C8.125 3.72989 8.48058 2.87145 9.11351 2.23851C9.74645 1.60558 10.6049 1.25 11.5 1.25C12.3951 1.25 13.2536 1.60558 13.8865 2.23851C14.5194 2.87145 14.875 3.72989 14.875 4.625V10.25C14.875 10.5832 14.8258 10.9145 14.7287 11.2332M12.4788 13.4832C11.9744 13.6361 11.4412 13.6687 10.922 13.5784C10.4028 13.4882 9.9119 13.2776 9.4887 12.9635C9.06549 12.6494 8.72171 12.2406 8.48491 11.7698C8.2481 11.299 8.12484 10.7793 8.125 10.2522V9.12725" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M3.625 10.25C3.62475 11.6713 4.00915 13.0661 4.73742 14.2866C5.46568 15.5071 6.51068 16.5077 7.76159 17.1824C9.01249 17.8571 10.4227 18.1807 11.8426 18.1189C13.2625 18.0571 14.6392 17.6121 15.8267 16.8313M18.0767 14.5813C18.9248 13.2961 19.3756 11.78ƒbtn)97 19.3727 10.25" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M7 22.625H16" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M11.5 18.125V22.625" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1.375 2.375L21.625 22.625" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M14.875 11.375V10.25L19.9971 7.68951C20.1686 7.60383 20.3591 7.56338 20.5506 7.572C20.7421 7.58063 20.9282 7.63804 21.0913 7.73879C21.2544 7.83955 21.389 7.9803 21.4824 8.14769C21.5758 8.31509 21.6249 8.50357 21.625 8.69526V16.3048C21.6251 16.5392 21.5519 16.7677 21.4158 16.9585C21.2796 17.1493 21.0873 17.2928 20.8656 17.369" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M9.25 5.75H12.625C13.2217 5.75 13.794 5.98705 14.216 6.40901C14.6379 6.83097 14.875 7.40326 14.875 8V11.375M14.875 15.875V17C14.875 17.5967 14.6379 18.169 14.216 18.591C13.794 19.0129 13.2217 19.25 12.625 19.25H3.625C3.02826 19.25 2.45597 19.0129 2.03401 18.591C1.61205 18.169 1.375 17.5967 1.375 17V8C1.375 7.40326 1.61205 6.83097 2.03401 6.40901C2.45597 5.98705 3.02826 5.75 3.625 5.75H4.75" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <p class="m-0 text-center pr-1">{$LL.camera.my.silentZone()}</p>
        </div>

        <!--If we have a video to display-->
    {:else if $localStreamStore.type === "success" && !$inExternalServiceStore}
        {#if $requestedCameraState && $mediaStreamConstraintsStore.video}
            <div class="absolute bottom-4 left-4 z-30">
                <div class="flex">
                    <span class="rounded-lg bg-contrast/90 backdrop-blur px-4 py-1 text-white text-sm pl-12 pr-4 bold">
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

            <div class="my-webcam-container z-40 rounded transition-all bg-no-repeat bg-center bg-contrast/80 backdrop-blur rounded-xl" style="background-image: url({loaderImg})">
                <video
                    class="h-full w-full rounded md:object-cover"
                    style="-webkit-transform: scaleX(-1);transform: scaleX(-1);"
                    use:srcObject={stream}
                    autoplay
                    muted
                    playsinline
                ></video>

                <div class="voice-meter-my-container justify-end z-[251] pr-2 absolute">
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
