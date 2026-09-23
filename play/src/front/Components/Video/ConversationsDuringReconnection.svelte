<script lang="ts">
    import { streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import PresentationLayout from "../EmbedScreens/Layouts/PresentationLayout.svelte";
    import AudioStreamWrapper from "./PictureInPicture/AudioStreamWrapper.svelte";
</script>

<!--
    The game is not on screen while it reconnects to the server (a play or back restart), but the conversations go on:
    they do not go through the server. Keep them seen and heard. Unmounted, the video tiles would also tell the other
    side to stop sending video (they report a 0x0 display).
-->
<div class="fixed top-0 inset-x-0 z-[3000]">
    <PresentationLayout inPictureInPicture={false} />
</div>
{#each [...$streamableCollectionStore.values()] as videoBox (videoBox.uniqueId)}
    <AudioStreamWrapper {videoBox} />
{/each}
