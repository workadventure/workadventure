<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { WokaData } from "./WokaTypes";
    import WokaImage from "./WokaImage.svelte";

    const dispatch = createEventDispatcher<{ rotate: { direction: number } }>();

    export let selectedTextures: Record<string, string>;
    export let wokaData: WokaData | null = null;
    export let getTextureUrl: (url: string) => string = (url) => url;

    // Directions correspond to the order of images in the sprite sheet:
    const directionsMapping = [0, 1, 3, 2];

    let direction: number = 0;
    const canvasSize = 130;
</script>

<div class="woka-preview flex items-center justify-center relative">
    <div class="p-6 relative flex items-center justify-center w-fit bg-white/10 rounded-lg">
        <button
            class="bg-white/10 hover:bg-white/20 rounded-md absolute bottom-2 right-2 aspect-square p-2 flex items-center justify-center"
            on:click={() => {
                direction = (direction + 1) % 4;
                dispatch("rotate", { direction: directionsMapping[direction] });
            }}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="icon icon-tabler icons-tabler-outline icon-tabler-reload"
                ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
                    d="M19.933 13.041a8 8 0 1 1 -9.925 -8.788c3.899 -1 7.935 1.007 9.425 4.747"
                /><path d="M20 4v5h-5" /></svg
            >
        </button>
        <WokaImage
            {selectedTextures}
            {wokaData}
            {getTextureUrl}
            {canvasSize}
            direction={directionsMapping[direction]}
        />
    </div>
</div>
