<script lang="ts">
    import {
        localVolumeStore,
        obtainedMediaConstraintStore,
        requestedMicrophoneState,
        silentStore,
    } from "../Stores/MediaStore";
    import { localStreamStore } from "../Stores/MediaStore";
    import SoundMeterWidget from "./SoundMeterWidget.svelte";
    import { onDestroy, onMount } from "svelte";
    import { getColorByString, getTextColorByBackgroundColor, srcObject } from "./Video/utils";
    import LL from "../i18n/i18n-svelte";
    import Woka from "./Woka/Woka.svelte";
    import { localUserStore } from "../Connexion/LocalUserStore";
    import microphoneOffImg from "./images/microphone-off-blue.png";

    let stream: MediaStream | null;
    let userName = localUserStore.getName();
    let backgroundColor = getColorByString(userName ?? "default");
    let textColor = getTextColorByBackgroundColor(backgroundColor);

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

<div
    class="tw-transition-all tw-self-end"
    class:hide={($localStreamStore.type !== "success" || !$obtainedMediaConstraintStore.video) && !$silentStore}
    bind:this={cameraContainer}
>
    {#if $silentStore}
        <div
            class="tw-flex tw-bg-dark-purple/95 tw-rounded tw-text-light-blue tw-p-1 tw-border-solid tw-border-light-blue tw-justify-center tw-h-10 tw-m-auto lg:tw-h-12 tw-items-center
            tw-align-middle tw-absolute tw-right-0 tw-left-0 lg:tw-bottom-3 lg:tw-right-3 lg:tw-left-auto tw-text-center tw-w-64"
        >
            {$LL.camera.my.silentZone()}
        </div>
    {:else if $localStreamStore.type === "success" && $localStreamStore.stream}
        <div
            class="nametag-webcam-container container-end media-box-camera-on-size video-on-responsive-height
  "
        >
            <i class="tw-flex">
                <span
                    style="background-color: {backgroundColor}; color: {textColor};"
                    class="nametag-text nametag-shape tw-pr-3 tw-pl-5 tw-h-4 tw-max-h-8">{$LL.camera.my.nameTag()}</span
                >
            </i>
        </div>
        <div class="woka-webcam-container container-end video-on-responsive-height tw-pb-1">
            <div class="tw-flex">
                <Woka userId={-1} placeholderSrc={""} customHeight="20px" customWidth="20px" />
            </div>
        </div>
        <div class="my-webcam-container tw-z-[250] tw-bg-dark-blue/50 tw-rounded tw-transition-all">
            <video
                class="tw-flex tw-h-full tw-max-w-full tw-m-auto tw-rounded"
                use:srcObject={stream}
                autoplay
                muted
                playsinline
            />

            <div class="voice-meter-my-container tw-justify-end tw-z-[251] tw-pr-2 tw-absolute">
                {#if $requestedMicrophoneState}
                    <SoundMeterWidget volume={$localVolumeStore} classcss="tw-absolute" barColor="blue" />
                {:else}
                    <img draggable="false" src={microphoneOffImg} class="tw-flex tw-p-1 tw-h-8 tw-w-8" alt="Mute" />
                {/if}
            </div>
        </div>
    {/if}
</div>

<style lang="scss">
    @import "../../style/breakpoints.scss";

    .hide {
        opacity: 0;
    }
</style>
