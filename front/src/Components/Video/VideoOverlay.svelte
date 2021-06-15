<script lang="ts">
    import {screenSharingStreamStore} from "../../Stores/PeerStore";
    import {DivImportance} from "../../WebRtc/LayoutManager";
    import Peer from "./Peer.svelte";
    import {layoutStore} from "../../Stores/LayoutStore";
    import {videoFocusStore} from "../../Stores/VideoFocusStore";

</script>

<div class="video-overlay">
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
    <div class="chat-mode three-col" style="display: none;">
    </div>


</div>

<style lang="scss">
    .video-overlay {
      display: flex;
      width: 100%;
      height: 100%;
    }
</style>
