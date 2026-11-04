<script lang="ts">
    import { streamableCollectionStore } from "../Stores/StreamableCollectionStore";
    import PresentationLayout from "./EmbedScreens/Layouts/PresentationLayout.svelte";
    import AudioStreamWrapper from "./Video/PictureInPicture/AudioStreamWrapper.svelte";
</script>

<!-- What the egress films in ?recorder mode: the camera tiles over the map, nothing else. -->
<div id="main-layout" class="@container/main-layout absolute h-full w-full pointer-events-none z-10 not-cowebsite">
    <section id="main-layout-main" class="flex-1 h-full w-full relative">
        <PresentationLayout inPictureInPicture={false} />
    </section>
    {#each [...$streamableCollectionStore.values()] as videoBox (videoBox.uniqueId)}
        <AudioStreamWrapper {videoBox} />
    {/each}
</div>

<style>
    #main-layout {
        container-type: size;
    }
</style>
