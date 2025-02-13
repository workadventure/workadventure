<script lang="ts">
    import { afterUpdate, onMount } from "svelte";
    import type JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";

    export let jitsiTrack: JitsiTrack;
    export let isLocal: boolean;
    export let isHighlighted: boolean;
    export let isMobileFormat: boolean;

    let videoElement: HTMLVideoElement;

    let aspectRatio = 1;

    onMount(() => {
        // TODO: remove this hack
        setTimeout(() => {
            aspectRatio = videoElement != undefined ? videoElement.videoWidth / videoElement.videoHeight : 1;
        }, 1000);
        attachTrack();
    });

    afterUpdate(() => {
        attachTrack();
    });

    function attachTrack() {
        jitsiTrack.attach(videoElement);
    }
</script>

<!-- svelte-ignore a11y-media-has-caption -->
<video
    bind:this={videoElement}
    class="h-full max-w-full rounded-sm"
    class:object-contain={isMobileFormat || aspectRatio < 1}
    class:scale-x-[-1]={isLocal && jitsiTrack.getVideoType() === "camera"}
    class:max-h-[40vh]={!isHighlighted}
    class:max-h-[80vh]={isHighlighted}
    autoplay
    playsinline
/>

<style lang="scss">
    /*    video.no-video {
      visibility: collapse;
  }*/
</style>
