<script lang="typescript">
    import type {ScreenSharingLocalMedia} from "../../Stores/ScreenSharingStore";
    import {videoFocusStore} from "../../Stores/VideoFocusStore";

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

    export let peer : ScreenSharingLocalMedia;
    let stream = peer.stream;
    export let cssClass : string|undefined;
</script>


<div class="video-container {cssClass ? cssClass : ''}" class:hide={!stream}>
    {#if stream}
    <video use:srcObject={stream} autoplay muted playsinline  on:click={() => videoFocusStore.toggleFocus(peer)}></video>
    {/if}
</div>
