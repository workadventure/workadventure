<script lang="ts">
    import { afterUpdate, onMount } from "svelte";
    import type JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";

    export let jitsiTrack: JitsiTrack;

    let audioElement: HTMLAudioElement;

    onMount(() => {
        attachTrack();
    });

    afterUpdate(() => {
        attachTrack();
    });

    function attachTrack() {
        if (jitsiTrack && !jitsiTrack?.isLocal()) {
            jitsiTrack?.attach(audioElement);
        }
    }
</script>

<audio autoplay muted={false} bind:this={audioElement} />

<style lang="scss">
    /*    video.no-video {
        visibility: collapse;
    }*/
</style>
