<script lang="ts">
    import { fade } from "svelte/transition";
    import { LL } from "../../../i18n/i18n-svelte";
    import { loaderProgressStore } from "../../Stores/LoaderStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import bgMap from "../images/map-exemple.png";
    import defaultLoader from "../images/Workadventure.gif";
    import { getRandomLoadingTip } from "./loadingTipsVideos";

    const logo = gameManager.currentStartedRoom.loadingLogo ?? defaultLoader;
    const sceneBg = gameManager.currentStartedRoom.backgroundSceneImage ?? bgMap;
    const bgColor = gameManager.currentStartedRoom.backgroundColor ?? "#1B2A41";
    const primary = gameManager.currentStartedRoom.primaryColor ?? "#4056F6";

    let currentTip = getRandomLoadingTip();
    let videoElement: HTMLVideoElement;

    function onVideoPlay() {
        currentTip = getRandomLoadingTip(currentTip.video);
    }
</script>

<div
    class="absolute top-0 left-0 z-50 h-dvh w-dvw"
    in:fade={{ duration: 100 }}
    out:fade={{ delay: 500, duration: 300 }}
>
    <div class="flex items-center min-h-dvh w-full relative z-30">
        <div class="flex flex-col items-center justify-center w-full h-full relative gap-4 px-4">
            <div class="mb-4 w-full flex justify-center">
                <img draggable="false" src={logo} class="max-h-10 px-4" alt="Logo loading screen" />
            </div>
            <div
                class="w-full max-w-md aspect-video rounded-lg overflow-hidden bg-black/40 flex items-center justify-center"
            >
                <video
                    bind:this={videoElement}
                    src={currentTip.video}
                    muted
                    autoplay
                    playsinline
                    class="w-full h-full object-contain"
                    on:ended={onVideoPlay}
                    on:error={onVideoPlay}
                />
            </div>
            <div class="w-full max-w-md text-center text-white">
                <h3 class="text-lg font-semibold mb-1">
                    {currentTip.getTitle($LL)}
                </h3>
                <p class="text-sm text-white/90">
                    {currentTip.getDesc($LL)}
                </p>
            </div>
            <div
                class="w-full max-w-md h-3 bg-contrast py-[1px] px-[1px] rounded border-[1px] border-solid border-black"
            >
                <div
                    class="h-full transition-all duration-200 py-[1px] px-[1px] rounded"
                    style="width: {$loaderProgressStore * 100}%; background-color: {primary};"
                />
            </div>
        </div>
    </div>
    <div class="absolute left-0 top-0 w-full h-full bg-cover z-10 blur" style="background-image: url({sceneBg});" />
    <div
        class="absolute left-0 top-0 w-full h-full z-20 backdrop-blur-md opacity-70"
        style="background-color: {bgColor};"
    />
</div>
