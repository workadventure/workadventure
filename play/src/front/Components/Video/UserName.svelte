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
    <div class="{position} z-30 responsive-dimension max-w-full max-h-full overflow-hidden ">
        <div class="flex items-center  p-2 m-1 rounded bg-transparent w-full">
            <div class="relative px-2 py-1 text-white text-sm rounded flex flex-col items-center w-full">
                <div
                    class="w-8 @[15rem]/videomediabox:w-16 @[25rem]/videomediabox:w-32"
                    style="image-rendering:pixelated"
                >
                    <Woka src={$picture ?? ""} customWidth="100%" {grayscale} />
                </div>
                <div class="flex items-center w-auto flex-grow text-wrap ">
                    <span class="select-none ">{name}</span>
                    <div class=" ml-2 overflow-hidden flex justify-center"><slot /></div>
                </div>
            </div>
        </div>
    </div>
{:else}
    <div class="{position} z-30 responsive-dimension w-full overflow-hidden">
        <div
            class="flex items-center justify-between rounded flex-wrap min-h-0 p-2 m-2 {isPlayingAudio
                ? 'bg-secondary/90'
                : 'bg-contrast/90'}"
        >
            <div
                class="relative backdrop-blur flex items-center px-2 py-1 text-white text-sm pl-12 bold rounded text-nowrap select-none"
            >
                <div class="absolute left-1 -top-1 z-30" style="image-rendering:pixelated">
                    <Woka src={$picture ?? ""} customWidth="42px" {grayscale} />
                </div>
                <span class="truncate">{name}</span>
                <!--{#if $requestedScreenSharingState === true}-->
                <!--    <ScreenShareIcon />-->
                <!--{/if}-->
            </div>
            <div class="flex-shrink-0 ml-2 max-w-[60%] overflow-hidden">
                <div class="text-xs break-words">
                    <slot />
                </div>
            </div>
        </div>
    </div>
{/if}
