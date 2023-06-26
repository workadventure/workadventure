<script lang="ts">
    import { LayoutMode } from "../../WebRtc/LayoutManager";
    import { embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";
    import PresentationLayout from "./Layouts/PresentationLayout.svelte";
    import MozaicLayout from "./Layouts/MozaicLayout.svelte";
    import "../../style/wa-theme/video-ui.scss";
</script>

<div id="embedScreensContainer">
    {#if $embedScreenLayoutStore === LayoutMode.Presentation}
        <PresentationLayout />
    {:else}
        <MozaicLayout />
    {/if}
</div>

<style lang="scss">
    #embedScreensContainer {
        display: flex;
        padding-top: 2%;
        height: 100%;
        position: relative;
    }
</style>
