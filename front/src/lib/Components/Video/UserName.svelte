<script lang="ts">
    import Woka from "../Woka/Woka.svelte";
    import { PictureStore } from "../../Stores/PictureStore";

    /**
     * A component that displays the Woka, the user's name and optionally a dropdown menu
     */

    // The background color is blue if the player has its microphone on
    export let isPlayingAudio = false;

    export let picture: PictureStore;
    export let name: string;
    export let position = "";
</script>

<div class="{position} z-30 responsive-dimension">
    <div class="flex justify-between rounded {isPlayingAudio ? 'bg-secondary/90' : 'bg-contrast/90'}">
        <div class="relative backdrop-blur px-2 py-1 text-white text-sm pl-12 bold rounded">
            <div class="absolute left-1 -top-1 z-30" style="image-rendering:pixelated">
                <Woka src={$picture ?? ""} customHeight="42px" customWidth="42px" />
            </div>
            {name}

            <!--{#if $requestedScreenSharingState === true}-->
            <!--    <ScreenShareIcon />-->
            <!--{/if}-->
        </div>

        <slot />
    </div>
</div>
