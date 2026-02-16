<script lang="ts">
    import { listenerWaitingMediaStore } from "../../Stores/MediaStore";
    import Loader from "../../Chat/Components/Loader.svelte";
    import { LL } from "../../../i18n/i18n-svelte";
</script>

<!--
  The outer line stays full width.
  We set its height with an inline style so the bottom bar controls it.
-->
<div class="w-full h-full flex justify-center pointer-events-auto relative bg-contrast rounded-lg items-center">
    <!-- Video box centered, width driven by line height with 16:9 ratio -->
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
