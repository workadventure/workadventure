<script lang="ts">
    import Peer from "./Peer.svelte";
    import {layoutStore} from "../../Stores/LayoutStore";
    import {videoFocusStore} from "../../Stores/VideoFocusStore";
</script>

<div class="main-section">
    {#each [...$layoutStore.values()] as peer (peer.uniqueId)}
        {#if $videoFocusStore && peer === $videoFocusStore }
            <Peer peer={peer}></Peer>
        {/if}
    {/each}
</div>
<aside class="sidebar">
    {#each [...$layoutStore.values()] as peer (peer.uniqueId)}
        {#if peer !== $videoFocusStore }
            <Peer peer={peer}></Peer>
        {/if}
    {/each}
</aside>
