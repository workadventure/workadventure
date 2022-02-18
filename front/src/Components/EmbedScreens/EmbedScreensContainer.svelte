<script lang="typescript">
    import PresentationLayout from "./Layouts/PresentationLayout.svelte";
    import MozaicLayout from "./Layouts/MozaicLayout.svelte";
    import { LayoutMode } from "../../WebRtc/LayoutManager";
    import { embedScreenLayout } from "../../Stores/EmbedScreensStore";
</script>

<div id="embedScreensContainer">
    {#if $embedScreenLayout === LayoutMode.Presentation}
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
    }
</style>
