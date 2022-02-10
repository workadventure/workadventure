<script lang="typescript">
    import { coWebsites } from "../../Stores/CoWebsiteStore";
    import CoWebsiteThumbnail from "./CoWebsiteThumbnailSlot.svelte";

    export let vertical = false;
</script>

{#if $coWebsites.length > 0}
    <div id="cowebsite-thumbnail-container" class:vertical>
        {#each [...$coWebsites.values()] as coWebsite, index (coWebsite.iframe.id)}
            <CoWebsiteThumbnail {index} {coWebsite} {vertical} />
        {/each}
    </div>
{/if}

<style lang="scss">
    #cowebsite-thumbnail-container {
        pointer-events: all;
        height: 100px;
        width: 100%;
        display: flex;
        position: absolute;
        bottom: 5px;
        left: 2%;
        overflow-x: auto;
        overflow-y: hidden;

        &.vertical {
            height: auto !important;
            width: auto !important;
            bottom: auto !important;
            left: auto !important;
            position: relative;
            overflow-x: hidden;
            overflow-y: auto;
            flex-direction: column;
            align-items: center;
            padding-top: 4px;
            padding-bottom: 4px;
        }
    }
</style>
