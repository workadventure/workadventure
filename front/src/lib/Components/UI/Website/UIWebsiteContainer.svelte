<script lang="ts">
    import { uiWebsitesStore } from "../../../Stores/UIWebsiteStore";
    import UiWebsiteLayer from "./UIWebsiteLayer.svelte";
</script>

<div id="ui-website-container">
    {#each $uiWebsitesStore as uiWebsite (uiWebsite.id)}
        <UiWebsiteLayer {uiWebsite} />
    {/each}
</div>

<style lang="scss">
    #ui-website-container {
        position: absolute;
        z-index: 180;
        height: 100%;
        width: 100%;
        top: 0;
        left: 0;
    }
</style>
