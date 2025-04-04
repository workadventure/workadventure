<script lang="ts">
    import { fade } from "svelte/transition";
    import { loaderProgressStore } from "../../Stores/LoaderStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import bgMap from "../images/map-exemple.png";
    import defaultLoader from "../images/Workadventure.gif";

    const logo = gameManager.currentStartedRoom.loadingLogo ?? defaultLoader;
    const bgColor = gameManager.currentStartedRoom.backgroundColor ?? "bg-secondary";
</script>

<div
    class="absolute top-0 left-0 z-50 h-dvh w-dvw"
    in:fade={{ duration: 100 }}
    out:fade={{ delay: 500, duration: 300 }}
>
    <div class="flex items-center min-h-dvh w-full w-dvw bg-contrast/80 backdrop-blur relative z-30">
        <div class="">
            <!--
            {#if gameManager.currentStartedRoom.loadingLogo && gameManager.currentStartedRoom.showPoweredBy !== false}
                <h1 class="text-white" >COUCOU { $loaderProgressStore }</h1>
            {/if}
            -->
            <div class="text-center mb-4 w-full">
                <img src={logo} class="max-h-10 px-4" alt="Logo loading screen" />
            </div>
            <div class="absolute w-full h-3 bg-contrast py-[2px]">
                <div
                    class="h-full transition-all duration-200"
                    style="width: {$loaderProgressStore * 100}%; background-color: {bgColor};"
                />
            </div>
        </div>
    </div>
    <div class="absolute left-0 top-0 w-full h-full bg-cover z-10" style="background-image: url('{bgMap}');" />
    <div class="absolute left-0 top-0 w-full h-full z-20" style="background-color: '{bgColor}';" />
</div>
