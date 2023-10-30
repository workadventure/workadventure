<script lang="ts">
    import { LayoutMode } from "../../WebRtc/LayoutManager";
    import { embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";
    import PresentationLayout from "./Layouts/PresentationLayout.svelte";
    import MozaicLayout from "./Layouts/MozaicLayout.svelte";
    import { emoteMenuSubStore } from "../../Stores/EmoteStore";
    import "../../style/wa-theme/video-ui.scss";
</script>

<div id="embedScreensContainer" class="relative h-full pt-24 flex justify-center items-center pointer-events-auto" style="{$emoteMenuSubStore ? 'padding-top:166px;' : '' }">
    {#if $embedScreenLayoutStore === LayoutMode.Presentation}
        <PresentationLayout />
    {:else}
        <MozaicLayout />
    {/if}
</div>

<style lang="scss">
</style>
