<script lang="ts">
    import Woka from "../Woka/Woka.svelte";
    import { PictureStore } from "../../Stores/PictureStore";

    export let isCameraDisabled = false;

    /**
     * A component that displays the Woka, the user's name and optionally a dropdown menu
     */

    // The background color is blue if the player has its microphone on
    export let isPlayingAudio = false;

    export let picture: PictureStore;
    export let name: string;
    export let position = "";
    export let grayscale = false;
</script>

{#if isCameraDisabled}
    <div class="{position} z-30 responsive-dimension ">
        <div class="flex justify-between  rounded bg-transparent">
            <div class="relative px-2 py-1 text-white text-sm bold rounded text-nowrap flex flex-col items-center ">
                <div class="" style="image-rendering:pixelated">
                    <Woka src={$picture ?? ""} customHeight="100px" customWidth="100px" {grayscale} />
                </div>
                <div class="flex items-center">
                    <span>{name}</span>
                    <slot />
                </div>
            </div>
        </div>
    </div>
{:else}
    <div class="{position} z-30 responsive-dimension">
        <div class="flex justify-between rounded {isPlayingAudio ? 'bg-secondary/90' : 'bg-contrast/90'}">
            <div class="relative backdrop-blur px-2 py-1 text-white text-sm pl-12 bold rounded text-nowrap">
                <div class="absolute left-1 -top-1 z-30" style="image-rendering:pixelated">
                    <Woka src={$picture ?? ""} customHeight="42px" customWidth="42px" {grayscale} />
                </div>
                {name}

                <!--{#if $requestedScreenSharingState === true}-->
                <!--    <ScreenShareIcon />-->
                <!--{/if}-->
            </div>

            <slot />
        </div>
    </div>
{/if}
