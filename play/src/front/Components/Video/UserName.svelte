<script lang="ts">
    import Woka from "../Woka/Woka.svelte";
    import { PictureStore } from "../../Stores/PictureStore";
    import { activePictureInPictureStore } from "../../Stores/PeerStore";

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
    <div class="{position} z-30 responsive-dimension">
        <div class="flex justify-between rounded bg-transparent">
            <div class="relative px-2 py-1 text-white text-sm bold rounded text-nowrap flex flex-col items-center">
                <div
                    class="w-8 @[15rem]/videomediabox:w-16 @[25rem]/videomediabox:w-32"
                    style="image-rendering:pixelated"
                >
                    <Woka src={$picture ?? ""} customWidth="100%" {grayscale} />
                </div>
                <div class="flex items-center">
                    <span class="select-none">{name}</span>
                    <slot />
                </div>
            </div>
        </div>
    </div>
{:else}
    <div class="{position} z-30 responsive-dimension">
        <div
            class="flex justify-between rounded
                {isPlayingAudio
                ? $activePictureInPictureStore
                    ? '@[10rem]/videomediabox:bg-secondary/90'
                    : '@[17.5rem]/videomediabox:bg-secondary/90'
                : $activePictureInPictureStore
                ? '@[10rem]/videomediabox:bg-contrast/90'
                : '@[17.5rem]/videomediabox:bg-contrast/90'}
            "
        >
            <div
                class="
                relative px-2 py-1 text-white text-sm text-shadow-md bold rounded text-nowrap select-none
                    {$activePictureInPictureStore
                    ? '@[10rem]/videomediabox:text-shadow-none @[10rem]/videomediabox:backdrop-blur'
                    : '@[17.5rem]/videomediabox:text-shadow-none @[17.5rem]/videomediabox:backdrop-blur'}
                "
                class:pl-12={$picture}
            >
                {#if $picture}
                    <div class="absolute left-1 -top-1 z-30" style="image-rendering:pixelated">
                        <Woka src={$picture} customWidth="42px" {grayscale} />
                    </div>
                {/if}
                {name}

                <!--{#if $requestedScreenSharingState === true}-->
                <!--    <ScreenShareIcon />-->
                <!--{/if}-->
            </div>

            <slot />
        </div>
    </div>
{/if}
