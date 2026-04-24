<svelte:options immutable={true} />

<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount, tick } from "svelte";
    import type { RemoteVideoTrack } from "livekit-client";
    import { get } from "svelte/store";
    import { activePictureInPictureStore } from "../../../Stores/PeerStore";
    import { NoVideoOutputDetector } from "./NoVideoOutputDetector";

    export let style: string;
    export let className: string;
    export let videoWidth: number;
    export let videoHeight: number;
    export let onLoadVideoElement: (event: Event) => void;

    export let remoteVideoTrack: RemoteVideoTrack;
    let videoElement: HTMLVideoElement;
    let noVideoOutputDetector: NoVideoOutputDetector | undefined;

    const dispatch = createEventDispatcher<{
        video: undefined;
        noVideo: undefined;
    }>();

    function refreshTrackAttachmentAfterPictureInPictureMove() {
        remoteVideoTrack.detach(videoElement);
        remoteVideoTrack.attach(videoElement);
    }

    onMount(() => {
        remoteVideoTrack.attach(videoElement);

        // Document PiP reparents the DOM after the first attach(); re-attach so LiveKit's
        // intersection / PiP heuristics run against the element in the PiP document when needed.
        if ($activePictureInPictureStore) {
            tick()
                .then(() => {
                    refreshTrackAttachmentAfterPictureInPictureMove();
                })
                .catch((error) => {
                    console.error("Error refreshing track attachment after Picture-in-Picture move", error);
                });
        }

        // This is a LiveKit bug. When the video element is reparented to the Picture-in-Picture window,
        // the track is detached from the video element. We need to re-attach it to the video element
        // If the track is not re-attached, the track will be considered as backgrounded and the video will be paused.
        // If the track is not re-attached, the visibilityChanged event will not be triggered and the track will not be considered as visible.
        let pip = get(activePictureInPictureStore);
        const unsubscribePictureInPicture = activePictureInPictureStore.subscribe((inPip) => {
            if (inPip === pip) {
                return;
            }
            pip = inPip;
            tick()
                .then(() => {
                    refreshTrackAttachmentAfterPictureInPictureMove();
                })
                .catch((error) => {
                    console.error("Error refreshing track attachment after Picture-in-Picture move", error);
                });
        });

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

        noVideoOutputDetector.expectVideoWithin5Seconds();

        return () => {
            unsubscribePictureInPicture();
        };
    });

    onDestroy(() => {
        remoteVideoTrack.detach(videoElement);

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
