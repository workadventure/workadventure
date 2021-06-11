<script lang="ts">
    import {screenSharingStreamStore} from "../../Stores/PeerStore";
    import {DivImportance} from "../../WebRtc/LayoutManager";
    import Peer from "./Peer.svelte";
    import {layoutStore} from "../../Stores/LayoutStore";

</script>

<div class="video-overlay">
    <div class="main-section">
        {#each [...$layoutStore.get(DivImportance.Important).values()] as peer (peer.uniqueId)}
            <Peer peer={peer}></Peer>
        {/each}
    </div>
    <aside class="sidebar">
        {#each [...$layoutStore.get(DivImportance.Normal).values()] as peer (peer.uniqueId)}
            <Peer peer={peer}></Peer>
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
