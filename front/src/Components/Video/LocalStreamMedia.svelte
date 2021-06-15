<script lang="typescript">
    import {ScreenSharingLocalMedia} from "../../Stores/ScreenSharingStore";
    import {videoFocusStore} from "../../Stores/VideoFocusStore";

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

    export let peer : ScreenSharingLocalMedia;
    let stream : MediaStream|undefined = peer.stream;
    export let cssClass : string|undefined;
</script>


<div class="video-container {cssClass ? cssClass : ''}" class:hide={!stream}>
    <video use:srcObject={stream} autoplay muted playsinline  on:click={() => videoFocusStore.toggleFocus(peer)}></video>
</div>
