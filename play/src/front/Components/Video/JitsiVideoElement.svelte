<script lang="ts">
    import { afterUpdate, onMount } from "svelte";
    import type JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";
    import { embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";

    import { LayoutMode } from "../../WebRtc/LayoutManager";

    export let jitsiTrack: JitsiTrack;
    export let isMobile: boolean;
    export let isLocal: boolean;

    let videoElement: HTMLVideoElement;

    onMount(() => {
        attachTrack();
    });

    afterUpdate(() => {
        attachTrack();
    });
    function attachTrack() {
        jitsiTrack.attach(videoElement);
    }
</script>

<video
    bind:this={videoElement}
    class:object-contain={isMobile || $embedScreenLayoutStore === LayoutMode.VideoChat}
    class="tw-h-full tw-max-w-full tw-rounded-sm"
    class:tw-scale-x-[-1]={isLocal && jitsiTrack.getVideoType() === 'camera'}
    autoplay
    playsinline
/>

<style lang="scss">
    /*    video.no-video {
      visibility: collapse;
  }*/
</style>
