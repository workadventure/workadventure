<script lang="ts">
    // import {LayoutMode} from "../../WebRtc/LayoutManager";
    // import {layoutModeStore} from "../../Stores/StreamableCollectionStore";
    // import PresentationLayout from "./PresentationLayout.svelte";
    // import ChatLayout from "./ChatLayout.svelte";
</script>

<div class="video-overlay">
    <!-- {#if $layoutModeStore === LayoutMode.Presentation }
        <PresentationLayout />
    {:else}
        <ChatLayout />
    {/if} -->
</div>

<style lang="scss">
    .video-overlay {
        display: flex;
        width: 100%;
        height: 100%;
    }
</style>
