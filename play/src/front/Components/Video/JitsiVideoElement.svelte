<script lang="ts">
    import { afterUpdate, onMount } from "svelte";
    import type JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";

    export let jitsiTrack: JitsiTrack;
    export let isLocal: boolean;
    export let isHightlighted: boolean;
    export let isMobileFormat: boolean;

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
    class="tw-h-full tw-max-w-full tw-rounded-sm"
    class:object-cover={isMobileFormat}
    class:tw-scale-x-[-1]={isLocal && jitsiTrack.getVideoType() === "camera"}
    class:tw-max-h-[230px]={!isHightlighted}
    class:tw-max-h-[80vh]={isHightlighted}
    autoplay
    playsinline
/>

<style lang="scss">
    /*    video.no-video {
      visibility: collapse;
  }*/
</style>
