<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import type { VideoCoWebsite } from "../../WebRtc/CoWebsite/VideoCoWebsite";
    import { screenWakeLock } from "../../Utils/ScreenWakeLock";

    export let actualCowebsite: VideoCoWebsite;
    export let visible: boolean;
    let screenWakeRelease: (() => Promise<void>) | undefined;
    let videoElement: HTMLVideoElement;

    async function requestWakeLock(): Promise<void> {
        try {
            screenWakeRelease = await screenWakeLock.requestWakeLock();
        } catch (error) {
            console.error("Error requesting screen wake lock:", error);
        }
    }

    async function releaseWakeLock(): Promise<void> {
        try {
            if (screenWakeRelease) {
                await screenWakeRelease();
                // eslint-disable-next-line require-atomic-updates
                screenWakeRelease = undefined;
            }
        } catch (error) {
            console.error("Error releasing screen wake lock:", error);
        }
    }

    function handlePlay(): void {
        requestWakeLock().catch((e) => console.error(e));
    }

    function handlePause(): void {
        releaseWakeLock().catch((e) => console.error(e));
    }

    function handleEnded(): void {
        releaseWakeLock().catch((e) => console.error(e));
    }

    onMount(() => {
        if (videoElement) {
            videoElement.addEventListener("play", handlePlay);
            videoElement.addEventListener("pause", handlePause);
            videoElement.addEventListener("ended", handleEnded);
        }
    });

    onDestroy(() => {
        if (videoElement) {
            videoElement.removeEventListener("play", handlePlay);
            videoElement.removeEventListener("pause", handlePause);
            videoElement.removeEventListener("ended", handleEnded);
        }
        releaseWakeLock().catch((e) => console.error(e));
    });
</script>

<div class="relative w-full h-full flex items-center justify-center bg-black" class:hidden={!visible}>
    <!-- svelte-ignore a11y-media-has-caption -->
    <video
        bind:this={videoElement}
        controls
        preload="metadata"
        class="max-w-full max-h-full object-contain"
        src={actualCowebsite.getUrl().toString()}
    >
        Your browser does not support the video tag.
    </video>
</div>
