<script lang="ts">
    import { afterUpdate, onMount, onDestroy } from "svelte";
    import type JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";
    import { Unsubscriber } from "svelte/store";
    import { hiddenStore } from "../../Stores/VisibilityStore";
    import { scriptUtils } from "../../Api/ScriptUtils";

    export let jitsiTrack: JitsiTrack;
    export let isLocal: boolean;
    export let isHightlighted: boolean;
    export let isMobileFormat: boolean;

    let videoElement: HTMLVideoElement;

    let aspectRatio = 1;

    let unsubscribeHidenStore: Unsubscriber | undefined;

    onMount(() => {
        // TODO: remove this hack
        setTimeout(() => {
            aspectRatio = videoElement != undefined ? videoElement.videoWidth / videoElement.videoHeight : 1;
        }, 1000);
        attachTrack();

        unsubscribeHidenStore = hiddenStore.subscribe((value) => {
            if (value) {
                scriptUtils.startPictureInpictureMode(videoElement);
            } else {
                //scriptUtils.exitPictureInpictureMode();
            }
        });
    });

    afterUpdate(() => {
        attachTrack();
    });

    function attachTrack() {
        jitsiTrack.attach(videoElement);
    }

    onDestroy(() => {
        if (unsubscribeHidenStore) unsubscribeHidenStore();
    });
</script>

<!-- svelte-ignore a11y-media-has-caption -->
<video
    bind:this={videoElement}
    class="tw-h-full tw-max-w-full tw-rounded-sm"
    class:object-contain={isMobileFormat || aspectRatio < 1}
    class:tw-scale-x-[-1]={isLocal && jitsiTrack.getVideoType() === "camera"}
    class:tw-max-h-[40vh]={!isHightlighted}
    class:tw-max-h-[80vh]={isHightlighted}
    autoplay
    playsinline
/>

<style lang="scss">
    /*    video.no-video {
      visibility: collapse;
  }*/
</style>
