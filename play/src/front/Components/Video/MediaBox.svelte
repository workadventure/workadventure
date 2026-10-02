<script lang="ts">
    //import { fly } from "svelte/transition";
    import { setContext } from "svelte";
    import type { VideoBox } from "../../Space/VideoBox";
    import VideoMediaBox from "./VideoMediaBox.svelte";

    interface Props {
        videoBox: VideoBox;
        fullScreen?: boolean;
        activeUserName?: boolean;
        // This context is used to know if the VideoMediaBox is part of the highlight fullscreen participant list.
        inHighlightFullscreenParticipantList?: boolean;
    }

    let {
        videoBox,
        fullScreen = false,
        activeUserName = true,
        inHighlightFullscreenParticipantList = false,
    }: Props = $props();
    setContext("inHighlightFullscreenParticipantList", (() => inHighlightFullscreenParticipantList)());
</script>

<!-- Bug with transition : transition:fly={{ y: 50, duration: 150 }} -->

<div class="video-media-box pointer-events-auto media-container justify-center relative h-full w-full">
    <!-- in:fly={{ y: 50, duration: 150 }} -->
    <VideoMediaBox {videoBox} {fullScreen} {activeUserName} />
</div>
