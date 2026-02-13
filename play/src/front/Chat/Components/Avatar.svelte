<script lang="ts">
    import { getColorByString } from "../../Utils/ColorGenerator";
    import type { PictureStore } from "../../Stores/PictureStore";

    export let pictureStore: PictureStore | undefined;
    export let fallbackName = "A";
    export let color: string | null = null;
    export let isChatAvatar = false;
</script>

{#if $pictureStore}
    <img
        src={$pictureStore}
        alt="User avatar"
        class="rounded-sm h-full w-full object-contain bg-white"
        draggable="false"
        style:background-color={`${color ? color : `${getColorByString(fallbackName)}`}`}
    />
{:else}
    <div
        class:chatAvatar={isChatAvatar}
        class="rounded-sm h-10 w-10 text-center uppercase text-white flex items-center justify-center font-bold aspect-square"
        draggable="false"
        style:background-color={`${color ? color : getColorByString(fallbackName)}`}
    >
        {fallbackName.charAt(0)}
    </div>
{/if}
