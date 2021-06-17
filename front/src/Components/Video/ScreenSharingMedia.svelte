<script lang="ts">
    import type {ScreenSharingPeer} from "../../WebRtc/ScreenSharingPeer";
    import {videoFocusStore} from "../../Stores/VideoFocusStore";

    export let peer: ScreenSharingPeer;
    let streamStore = peer.streamStore;
    let name = peer.userName;
    let statusStore = peer.statusStore;

    function srcObject(node: HTMLVideoElement, stream: MediaStream) {
        node.srcObject = stream;
        return {
            update(newStream: MediaStream) {
                if (node.srcObject != newStream) {
                    node.srcObject = newStream
                }
            }
        }
    }

    function getColorByString(str: string) : string|null {
        let hash = 0;
        if (str.length === 0) {
            return null;
        }
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
            hash = hash & hash;
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 255;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    }
</script>

<div class="video-container">
    {#if $statusStore === 'connecting'}
        <div class="connecting-spinner"></div>
    {/if}
    {#if $statusStore === 'error'}
        <div class="rtc-error"></div>
    {/if}
    {#if $streamStore === null}
        <i style="background-color: {getColorByString(name)};">{name}</i>
    {:else}
        <video use:srcObject={$streamStore} autoplay playsinline on:click={() => videoFocusStore.toggleFocus(peer)}></video>
    {/if}
</div>

<style lang="scss">
  .video-container {
    video {
      width: 100%;
    }
  }
</style>
