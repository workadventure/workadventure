<script lang="ts">
    import { listenerWaitingMediaStore } from "../../Stores/MediaStore";
</script>

<div class="w-full h-fit flex justify-center pointer-events-auto">
    <div class="bg-contrast aspect-video rounded-lg w-full mx-1 md:w-[calc(100vw/4)] flex justify-center items-center">
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
            <p class="m-0 p-0">The live not starting, speaker comming soon 👋</p>
        {/if}
    </div>
</div>
