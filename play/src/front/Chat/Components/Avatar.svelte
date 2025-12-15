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
        class="rounded-sm h-6 w-6 object-contain bg-white"
        draggable="false"
        style:background-color={`${color ? color : `${getColorByString(fallbackName)}`}`}
    />
{:else}
    <div
        class:chatAvatar={isChatAvatar}
        class="rounded-sm bg-amber-600 h-7 w-7 text-center uppercase text-white flex items-center justify-center font-bold"
        draggable="false"
        style:background-color={`${color ? color : getColorByString(fallbackName)}`}
    >
        {fallbackName.charAt(0)}
    </div>
{/if}

<style>
    .chatAvatar {
        border-style: solid;
        border-color: rgb(27 42 65 / 0.95);
        border-width: 1px;
    }
</style>
