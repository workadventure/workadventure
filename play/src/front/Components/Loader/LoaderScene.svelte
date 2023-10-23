<script lang="ts">

    import { fly, fade } from "svelte/transition";
    import {loaderProgressStore} from "../../Stores/LoaderStore";
    import {gameManager} from "../../Phaser/Game/GameManager";
    import bgMap from "../images/map-exemple.png";
</script>

<div class="relative z-50 h-screen w-screen"
     in:fade={{ delay: 100, duration: 500 }}
     out:fade={{ delay: 500, duration: 150 }}
>
    <div class="flex items-center min-h-screen w-full w-screen bg-contrast/80 backdrop-blur relative z-20">
        <div class="">
            <!--
            {#if gameManager.currentStartedRoom.loadingLogo && gameManager.currentStartedRoom.showPoweredBy !== false}
                <h1 class="text-white" >COUCOU { $loaderProgressStore }</h1>
            {/if}
            -->
            <div class="text-center mb-4 w-full">
                <img src="./static/images/Workadventure.gif" class="max-h-10 px-4" />
            </div>
            <div class="absolute w-full h-3 bg-contrast py-[2px]">
                <div class="bg-secondary h-full transition-all duration-200" style="width: {$loaderProgressStore * 100}%"></div>
            </div>
        </div>
    </div>
    <div class="absolute left-0 top-0 w-full h-full bg-cover z-10" style="background-image: url('{bgMap}');"></div>
</div>