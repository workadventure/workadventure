<script lang="ts">
    import {streamableCollectionStore} from "../../Stores/StreamableCollectionStore";
    import {videoFocusStore} from "../../Stores/VideoFocusStore";
    import {afterUpdate} from "svelte";
    import {biggestAvailableAreaStore} from "../../Stores/BiggestAvailableAreaStore";
    import MediaBox from "./MediaBox.svelte";

    afterUpdate(() => {
        biggestAvailableAreaStore.recompute();
    })
</script>

<div class="main-section">
    {#if $videoFocusStore }
        <MediaBox streamable={$videoFocusStore}></MediaBox>
    {/if}
</div>
<aside class="sidebar">
    {#each [...$streamableCollectionStore.values()] as peer (peer.uniqueId)}
        {#if peer !== $videoFocusStore }
            <MediaBox streamable={peer}></MediaBox>
        {/if}
    {/each}
</aside>
