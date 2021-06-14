<script lang="typescript">
    import {ScreenSharingLocalMedia} from "../../Stores/ScreenSharingStore";

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


<div class="video-container {cssClass}" class:hide={!stream}>
    <video class="myCamVideo" use:srcObject={stream} autoplay muted playsinline  on:click={() => peer.importanceStore.toggle()}></video>
</div>
