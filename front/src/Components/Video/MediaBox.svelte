<script lang="ts">
    import {VideoPeer} from "../../WebRtc/VideoPeer";
    import VideoMediaBox from "./VideoMediaBox.svelte";
    import ScreenSharingMediaBox from "./ScreenSharingMediaBox.svelte";
    import {ScreenSharingPeer} from "../../WebRtc/ScreenSharingPeer";
    import LocalStreamMediaBox from "./LocalStreamMediaBox.svelte";
    import type {Streamable} from "../../Stores/StreamableCollectionStore";

    export let streamable: Streamable;
</script>

<div class="media-container">
    {#if streamable instanceof VideoPeer}
        <VideoMediaBox peer={streamable}/>
    {:else if streamable instanceof ScreenSharingPeer}
        <ScreenSharingMediaBox peer={streamable}/>
    {:else}
        <LocalStreamMediaBox peer={streamable} cssClass=""/>
    {/if}
</div>
