<script lang="ts">
    import {localVolumeStore, obtainedMediaConstraintStore, silentStore} from "../Stores/MediaStore";
    import {localStreamStore} from "../Stores/MediaStore";
    import SoundMeterWidget from "./SoundMeterWidget.svelte";
    import {onDestroy, onMount} from "svelte";
    import {srcObject} from "./Video/utils";
    import LL from "../i18n/i18n-svelte";

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

<div class="tw-transition-transform tw-duration-700"
        class:hide={($localStreamStore.type !== "success" || !$obtainedMediaConstraintStore.video) && !$silentStore}
        bind:this={cameraContainer}
>
    {#if $silentStore}
        <div class="is-silent">{$LL.camera.my.silentZone()}</div>
    {:else if $localStreamStore.type === "success" && $localStreamStore.stream}
        <div class="my-webcam-container tw-flex tw-h-24 tw-w-44 sm:tw-h-48 sm:tw-w-80 md:tw-h-20 md:tw-w-36 lg:tw-h-24 lg:tw-w-44 xl:tw-h-36 xl:tw-w-64 2xl:tw-h-48 2xl:tw-w-96
    tw-absolute tw-m-auto tw-left-auto tw-right-2 tw-bottom-24 md:tw-bottom-4 tw-z-[250] tw-bg-dark-blue/50 tw-rounded
">
            <video class="tw-flex tw-h-full tw-max-w-full tw-rounded tw-m-auto" use:srcObject={stream} autoplay muted
                   playsinline/>
        </div>
        <div class="tw-flex tw-h-24 tw-w-44 sm:tw-h-48 sm:tw-w-80 md:tw-h-20 md:tw-w-36 lg:tw-h-24 lg:tw-w-44 xl:tw-h-36 xl:tw-w-64 2xl:tw-h-48 2xl:tw-w-96 tw-absolute
        tw-m-auto tw-left-auto tw-right-2 tw-bottom-24 md:tw-bottom-4 tw-justify-end tw-z-[251] tw-pr-2
">
            <SoundMeterWidget volume={$localVolumeStore} classcss="tw-absolute"/>
        </div>
    {/if}
</div>

<style lang="scss">
  @import "../../style/breakpoints.scss";
  
  .is-silent {
    font-size: 2em;
    color: white;
    padding: 40px 20px;
  }
</style>
