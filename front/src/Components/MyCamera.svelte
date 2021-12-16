<script lang="typescript">
    import { localUserStore } from "../Connexion/LocalUserStore";
    import { obtainedMediaConstraintStore } from "../Stores/MediaStore";
    import { localStreamStore, isSilentStore } from "../Stores/MediaStore";
    import SoundMeterWidget from "./SoundMeterWidget.svelte";
    import { onDestroy } from "svelte";
    import { srcObject } from "./Video/utils";

    let stream: MediaStream | null;

    const unsubscribe = localStreamStore.subscribe((value) => {
        if (value.type === "success") {
            stream = value.stream;
        } else {
            stream = null;
        }
    });

    onDestroy(unsubscribe);

    let isSilent: boolean;
    const unsubscribeIsSilent = isSilentStore.subscribe((value) => {
        isSilent = value;
    });

    onDestroy(unsubscribeIsSilent);
</script>

<div>
    <div class="video-container div-myCamVideo" class:hide={!$obtainedMediaConstraintStore.video || isSilent}>
        {#if $localStreamStore.type === "success" && $localStreamStore.stream}
            <video class="myCamVideo" use:srcObject={stream} autoplay muted playsinline />
            <SoundMeterWidget {stream} />
        {/if}
    </div>
    <div class="is-silent" class:hide={isSilent && localUserStore.getAlwaysSilent()}>Silent mode</div>
    <div class="is-silent" class:hide={isSilent && !localUserStore.getAlwaysSilent()}>Silent zone</div>
</div>
