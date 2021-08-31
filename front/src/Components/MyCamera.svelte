<script lang="typescript">
    import {obtainedMediaConstraintStore} from "../Stores/MediaStore";
    import {localStreamStore} from "../Stores/MediaStore";
    import SoundMeterWidget from "./SoundMeterWidget.svelte";
    import {onDestroy} from "svelte";
    import {srcObject} from "./Video/utils";

    let stream : MediaStream|null;

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
    <div class="video-container div-myCamVideo" class:hide={!$obtainedMediaConstraintStore.video}>
        {#if $localStreamStore.type === "success" && $localStreamStore.stream}
        <video class="myCamVideo" use:srcObject={stream} autoplay muted playsinline></video>
        <SoundMeterWidget stream={stream}></SoundMeterWidget>
        {/if}
    </div>
</div>
