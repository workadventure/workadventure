<script lang="ts">
    import { localVolumeStore, obtainedMediaConstraintStore, silentStore } from "../Stores/MediaStore";
    import { localStreamStore } from "../Stores/MediaStore";
    import SoundMeterWidget from "./SoundMeterWidget.svelte";
    import { onDestroy, onMount } from "svelte";
    import { srcObject } from "./Video/utils";
    import LL from "../i18n/i18n-svelte";
    import { fly } from "svelte/transition";

    let stream: MediaStream | null;

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
    class="tw-transition-all"
    class:hide={($localStreamStore.type !== "success" || !$obtainedMediaConstraintStore.video) && !$silentStore}
    bind:this={cameraContainer}
    transition:fly={{ x: 100, duration: 2000 }}
>
    {#if $silentStore}
        <div
            class="tw-flex tw-bg-dark-purple/95 tw-rounded tw-text-light-blue tw-p-1 tw-border-solid tw-border-light-blue tw-justify-center tw-h-10 tw-m-auto lg:tw-h-12 tw-items-center  tw-align-middle tw-absolute tw-right-0 tw-left-0 lg:tw-bottom-3 lg:tw-right-3 lg:tw-left-auto tw-text-center tw-w-64"
        >
            {$LL.camera.my.silentZone()}
        </div>
    {:else if $localStreamStore.type === "success" && $localStreamStore.stream}
        <div
            transition:fly={{ x: 100, duration: 2000 }}
            class="my-webcam-container tw-z-[250] tw-bg-dark-blue/50 tw-rounded tw-transition-all">
            <video
                class="tw-flex tw-h-full tw-max-w-full tw-m-auto tw-rounded"
                use:srcObject={stream}
                autoplay
                muted
                playsinline
            />
        </div>
        <div class="voice-meter-my-container tw-justify-end tw-z-[251] tw-pr-2">
            <SoundMeterWidget volume={$localVolumeStore} classcss="tw-absolute" barColor="blue"/>
        </div>
    {/if}
</div>

<style lang="scss">
    @import "../../style/breakpoints.scss";

    .hide {
        opacity: 0;
    }
</style>
