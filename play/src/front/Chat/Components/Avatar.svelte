<script lang="ts">
    import { getColorByString } from "../../Utils/ColorGenerator";
    import type { PictureStore } from "../../Stores/PictureStore";

    export let pictureStore: PictureStore | undefined;
    export let fallbackName = "A";
    export let color: string | null = null;
    export let isChatAvatar = false;
    /** Matches User list rows: 28×28px, rounded-md */
    export let compact = false;

    let forceFallback = false;

    $: sizeClass = compact ? "h-7 w-7 rounded-md" : "h-10 w-10 rounded-sm";
</script>

{#if $pictureStore && !forceFallback}
    <img
        src={$pictureStore}
        alt="User avatar"
        class="object-contain bg-white {sizeClass}"
        draggable="false"
        style:background-color={`${color ? color : `${getColorByString(fallbackName)}`}`}
        on:error={(event) => {
            console.warn(`Failed to load avatar image for ${fallbackName}`, event);
            forceFallback = true;
        }}
    />
{:else}
    <div
        class:chatAvatar={isChatAvatar}
        class="text-center uppercase text-white flex items-center justify-center font-bold aspect-square {sizeClass}"
        draggable="false"
        style:background-color={`${color ? color : getColorByString(fallbackName)}`}
    >
        {fallbackName.charAt(0)}
    </div>
{/if}
