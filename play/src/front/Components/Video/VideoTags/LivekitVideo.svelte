<script lang="ts">
    import { createEventDispatcher, onDestroy } from "svelte";
    import { Readable } from "svelte/store";
    import { RemoteVideoTrack } from "livekit-client";
    import { NoVideoOutputDetector } from "./NoVideoOutputDetector";

    export let style: string;
    export let className: string;
    export let videoWidth: number;
    export let videoHeight: number;
    export let onLoadVideoElement: (event: Event) => void;

    export let remoteVideoTrack: Readable<RemoteVideoTrack | undefined>;
    let videoElement: HTMLVideoElement;
    let noVideoOutputDetector: NoVideoOutputDetector | undefined;

    let attachedVideoTrack: RemoteVideoTrack | undefined;

    const dispatch = createEventDispatcher<{
        video: undefined;
        noVideo: undefined;
    }>();

    $: {
        if ($remoteVideoTrack) {
            if ($remoteVideoTrack !== attachedVideoTrack) {
                if (attachedVideoTrack) {
                    attachedVideoTrack.detach(videoElement);
                }
            }
            attachedVideoTrack = $remoteVideoTrack;
            attachedVideoTrack.attach(videoElement);

            if (noVideoOutputDetector) {
                noVideoOutputDetector.destroy();
            }

            noVideoOutputDetector = new NoVideoOutputDetector(
                videoElement,
                () => {
                    dispatch("noVideo");
                },
                () => {
                    dispatch("video");
                }
            );
        }
    }

    onDestroy(() => {
        if (attachedVideoTrack) {
            attachedVideoTrack.detach(videoElement);
        }
        noVideoOutputDetector?.destroy();
    });
</script>

<video
    {style}
    bind:videoWidth
    bind:videoHeight
    bind:this={videoElement}
    on:loadedmetadata={onLoadVideoElement}
    class={className}
    autoplay
    playsinline
    muted={true}
/>
