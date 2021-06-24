<script lang="typescript">
    import {localStreamStore} from "../Stores/MediaStore";
    import SoundMeterWidget from "./SoundMeterWidget.svelte";
    import {onDestroy} from "svelte";

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

    let stream : MediaStream|null;
    /*$: {
        if ($localStreamStore.type === 'success') {
            stream = $localStreamStore.stream;
        } else {
            stream = null;
        }
    }*/

    const unsubscribe = localStreamStore.subscribe(value => {
        if (value.type === 'success') {
            stream = value.stream;
        } else {
            stream = null;
        }
    });

    onDestroy(unsubscribe);

</script>


<div>
    <div class="video-container div-myCamVideo" class:hide={!$localStreamStore.constraints.video}>
        {#if $localStreamStore.type === "success" && $localStreamStore.stream }
        <video class="myCamVideo" use:srcObject={$localStreamStore.stream} autoplay muted playsinline></video>
        <SoundMeterWidget stream={stream}></SoundMeterWidget>
        {/if}
    </div>
</div>
