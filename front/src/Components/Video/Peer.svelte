<script lang="ts">
    import {VideoPeer} from "../../WebRtc/VideoPeer";
    import VideoMedia from "./VideoMedia.svelte";
    import ScreenSharingMedia from "./ScreenSharingMedia.svelte";
    import {ScreenSharingPeer} from "../../WebRtc/ScreenSharingPeer";
    import LocalStreamMedia from "./LocalStreamMedia.svelte";
    import type {DisplayableMedia} from "../../Stores/LayoutStore";

    export let peer: DisplayableMedia;
</script>

<div class="media-container">
    {#if peer instanceof VideoPeer}
        <VideoMedia peer={peer}/>
    {:else if peer instanceof ScreenSharingPeer}
        <ScreenSharingMedia peer={peer}/>
    {:else}
        <LocalStreamMedia peer={peer} cssClass=""/>
    {/if}
</div>
