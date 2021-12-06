<script lang="ts">
    import type { ScreenSharingPeer } from "../../WebRtc/ScreenSharingPeer";
    import { videoFocusStore } from "../../Stores/VideoFocusStore";
    import { getColorByString, srcObject } from "./utils";

    export let peer: ScreenSharingPeer;
    let streamStore = peer.streamStore;
    let name = peer.userName;
    let statusStore = peer.statusStore;
</script>

<div class="video-container">
    {#if $statusStore === "connecting"}
        <div class="connecting-spinner" />
    {/if}
    {#if $statusStore === "error"}
        <div class="rtc-error" />
    {/if}
    {#if $streamStore === null}
        <i style="background-color: {getColorByString(name)};">{name}</i>
    {:else}
        <!-- svelte-ignore a11y-media-has-caption -->
        <video use:srcObject={$streamStore} autoplay playsinline on:click={() => videoFocusStore.toggleFocus(peer)} />
    {/if}
</div>

<style lang="scss">
    .video-container {
        video {
            width: 100%;
        }
    }
</style>
