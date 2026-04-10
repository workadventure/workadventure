<script lang="ts">
    import Woka from "../Woka/Woka.svelte";
    import type { PictureStore } from "../../Stores/PictureStore";

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
    export let isBlocked = false;
</script>

{#if isCameraDisabled || isBlocked}
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
            class="flex justify-between rounded {isPlayingAudio
                ? 'bg-secondary/50 @[17.5rem]/videomediabox:bg-secondary/90'
                : 'bg-contrast/50 @[17.5rem]/videomediabox:bg-contrast/90'}"
        >
            <div
                class="relative @[17.5rem]/videomediabox:backdrop-blur px-2 py-[2px] text-white text-sm text-shadow-md @[17.5rem]/videomediabox:text-shadow-none {$picture
                    ? 'pl-12'
                    : ''} bold rounded text-nowrap select-none"
            >
                {#if $picture}
                    <div class="absolute left-1 -top-1 z-30" style="image-rendering:pixelated">
                        <Woka src={$picture} customWidth="42px" {grayscale} />
                    </div>
                {/if}
                <span class="text-xs @[17.5rem]/videomediabox:text-sm">{name}</span>

                <!--{#if $requestedScreenSharingState === true}-->
                <!--    <ScreenShareIcon />-->
                <!--{/if}-->
            </div>

            <slot />
        </div>
    </div>
{/if}
