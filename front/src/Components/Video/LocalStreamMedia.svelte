<script lang="typescript">
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

    export let stream : MediaStream|undefined;
    export let cssClass : string|undefined;
</script>


<div class="video-container {cssClass}" class:hide={!stream}>
    <video class="myCamVideo" use:srcObject={stream} autoplay muted playsinline></video>
</div>
