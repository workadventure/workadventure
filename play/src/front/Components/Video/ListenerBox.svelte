<script lang="ts">
    import { listenerWaitingMediaStore } from "../../Stores/MediaStore";
    import Loader from "../../Chat/Components/Loader.svelte";
    import { LL } from "../../../i18n/i18n-svelte";

    export let width: number;
    export let height: number;
</script>

<div class="video-media-box pointer-events-auto media-container justify-center relative h-full w-full">
    <div
        class="bg-contrast rounded-lg flex justify-center items-center overflow-hidden"
        style="width: {width}px; height: {height}px; max-width: 100%; max-height: 100%;"
    >
        {#if $listenerWaitingMediaStore != undefined}
            <iframe
                class="w-full h-full rounded-lg border-0"
                src={$listenerWaitingMediaStore}
                title="Embedded video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen
            />
        {:else}
            <Loader text={$LL.mapEditor.properties.listenerMegaphone.waitingSpeaker()} className="m-4" />
        {/if}
    </div>
</div>
