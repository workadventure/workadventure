<script lang="typescript">
    import {localStreamStore} from "../Stores/MediaStore";
    import SoundMeterWidget from "./SoundMeterWidget.svelte";
    import {onDestroy} from "svelte";

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
        <video class="myCamVideo" use:srcObject={$localStreamStore.stream} autoplay muted playsinline></video>
        <!-- {#if stream}
        <SoundMeterWidget stream={stream}></SoundMeterWidget>
        {/if} -->
    </div>
</div>
