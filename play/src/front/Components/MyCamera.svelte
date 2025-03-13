<script lang="ts">
    import { derived, writable } from "svelte/store";
    import {
        localVolumeStore,
        requestedCameraState,
        localStreamStore,
        requestedMicrophoneState,
        localVoiceIndicatorStore,
        cameraEnergySavingStore,
        silentStore,
    } from "../Stores/MediaStore";
    import { LL } from "../../i18n/i18n-svelte";
    import { currentPlayerWokaStore } from "../Stores/CurrentPlayerWokaStore";
    import { Streamable } from "../Stores/StreamableCollectionStore";
    import VideoMediaBox from "./Video/VideoMediaBox.svelte";

    let streamStore = derived(localStreamStore, (myLocalStream) => {
        if (myLocalStream.type === "success") {
            return myLocalStream.stream;
        }
        return undefined;
    });

    const peer: Streamable = {
        uniqueId: "-1",
        media: {
            type: "mediaStore",
            streamStore: streamStore,
        },
        volumeStore: localVolumeStore,
        hasVideo: requestedCameraState,
        // hasAudio = true because the webcam has a microphone attached and could potentially play sound
        hasAudio: writable(true),
        isMuted: derived(requestedMicrophoneState, (micState) => !micState),
        statusStore: writable("connected"),
        getExtendedSpaceUser: () => undefined,
        name: writable($LL.camera.my.nameTag()),
        showVoiceIndicator: localVoiceIndicatorStore,
        pictureStore: currentPlayerWokaStore,
    };
</script>

{#if !$cameraEnergySavingStore && !$silentStore}
    <VideoMediaBox {peer} isHighlighted={false} fullScreen={false} flipX={true} muted={true} />
{/if}
