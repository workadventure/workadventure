<script lang="ts">
    import { myCameraPeerStore } from "../../Stores/StreamableCollectionStore";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import { highlightFullScreen } from "../../Stores/ActionsCamStore";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import {
        orderedStreamableCollectionStore,
        maxVisibleVideosStore,
    } from "../../Stores/OrderedStreamableCollectionStore";
    import { activePictureInPictureStore } from "../../Stores/PeerStore";
    import { oneLineStreamableCollectionStore } from "../../Stores/OneLineStreamableCollectionStore";
    import { playerMovedInTheLast10Seconds } from "../../Stores/VideoLayoutStore";
    import type { VideoBox as VideoBoxModel } from "../../Space/VideoBox";
    import MediaBox from "../Video/MediaBox.svelte";
    import CamerasContainerLayout from "./CamerasContainerLayout.svelte";

    interface Props {
        oneLineMaxHeight: number;
        isOnOneLine: boolean;
        oneLineMode: "vertical" | "horizontal";
    }

    let { oneLineMaxHeight, isOnOneLine, oneLineMode = "horizontal" }: Props = $props();
</script>

<CamerasContainerLayout
    {oneLineMaxHeight}
    {isOnOneLine}
    {oneLineMode}
    oneLineStreamableCollection={$oneLineStreamableCollectionStore}
    orderedStreamableCollection={$orderedStreamableCollectionStore}
    activePictureInPicture={$activePictureInPictureStore}
    highlightedEmbedScreen={$highlightedEmbedScreen}
    highlightFullScreen={$highlightFullScreen}
    playerMovedInTheLast10Seconds={$playerMovedInTheLast10Seconds}
    localCameraVideoBox={$myCameraPeerStore}
    cameraContainerHeightRatio={localUserStore.getCameraContainerHeight()}
    setMaxVisibleVideos={(value) => maxVisibleVideosStore.set(value)}
    onCameraContainerHeightRatioChange={(ratio) => localUserStore.setCameraContainerHeight(ratio)}
    onResizeEnd={() => analyticsClient.resizeCameraLayout()}
    {mediaRenderer}
/>

{#snippet mediaRenderer(videoBox: VideoBoxModel)}
    <MediaBox {videoBox} />
{/snippet}
