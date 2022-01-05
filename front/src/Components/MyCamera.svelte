<script lang="typescript">
    import { obtainedMediaConstraintStore } from "../Stores/MediaStore";
    import { localStreamStore, isSilentStore } from "../Stores/MediaStore";
    import SoundMeterWidget from "./SoundMeterWidget.svelte";
    import { onDestroy, onMount } from "svelte";
    import { srcObject } from "./Video/utils";
    import LL from "../i18n/i18n-svelte";

    let stream: MediaStream | null;

    const unsubscribe = localStreamStore.subscribe((value) => {
        if (value.type === "success") {
            stream = value.stream;
        } else {
            stream = null;
        }
    });

    onDestroy(unsubscribe);

    let isSilent: boolean;
    const unsubscribeIsSilent = isSilentStore.subscribe((value) => {
        isSilent = value;
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

    onDestroy(unsubscribeIsSilent);
</script>

<div
    class="nes-container is-rounded my-cam-video-container"
    class:hide={($localStreamStore.type !== "success" || !$obtainedMediaConstraintStore.video) && !isSilent}
    bind:this={cameraContainer}
>
    {#if isSilent}
        <div class="is-silent">{$LL.camera.my.silentZone()}</div>
    {:else if $localStreamStore.type === "success" && $localStreamStore.stream}
        <video class="my-cam-video" use:srcObject={stream} autoplay muted playsinline />
        <SoundMeterWidget {stream} />
    {/if}
</div>

<style lang="scss">
    @import "../../style/breakpoints.scss";

    .my-cam-video-container {
        position: absolute;
        right: 15px;
        bottom: 30px;
        max-height: 20%;
        transition: transform 1000ms;
        padding: 0;
        background-color: #00000099;
        overflow: hidden;
    }

    .my-cam-video-container.hide {
        transform: translateX(200%);
    }

    .my-cam-video {
        background-color: #00000099;
        max-height: 20vh;
        width: 100%;
        -webkit-transform: scaleX(-1);
        transform: scaleX(-1);
    }

    .is-silent {
        font-size: 2em;
        color: white;
        padding: 40px 20px;
    }

    @include media-breakpoint-up(md) {
        .my-cam-video {
            width: 150px;
        }

        .my-cam-video-container.hide {
            right: -160px;
        }
    }
</style>
