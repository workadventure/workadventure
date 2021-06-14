<script lang="ts">
    import {ScreenSharingPeer} from "../../WebRtc/ScreenSharingPeer";

    export let peer: ScreenSharingPeer;
    let streamStore = peer.streamStore;
    let name = peer.userName;
    let statusStore = peer.statusStore;

    function srcObject(node, stream) {
        node.srcObject = stream;
        return {
            update(newStream) {
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
    {/if}
    <video use:srcObject={$streamStore} autoplay playsinline on:click={() => peer.importanceStore.toggle()}></video>
</div>

<style lang="scss">
  .video-container {
    video {
      width: 100%;
    }
  }
</style>
