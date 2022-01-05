<script lang="typescript">
    import { coWebsiteThumbails } from "../../Stores/CoWebsiteStore";
    import CoWebsiteThumbnail from "./CoWebsiteThumbnailSlot.svelte";

    export let vertical = false;
</script>

{#if $coWebsiteThumbails.length > 0}
    <div id="cowebsite-thumbnail-container" class:vertical>
        {#each [...$coWebsiteThumbails.values()] as coWebsite, index (coWebsite.iframe.id)}
            <CoWebsiteThumbnail {index} {coWebsite} {vertical} />
        {/each}
    </div>
{/if}

<style lang="scss">
    #cowebsite-thumbnail-container {
        pointer-events: all;
        height: 12%;
        display: flex;
        overflow-x: auto;
        overflow-y: hidden;

        &.vertical {
            height: auto !important;
            overflow-x: hidden;
            overflow-y: auto;
            flex-direction: column;
            align-items: center;
            padding-top: 4px;
            padding-bottom: 4px;
        }
    }
</style>
