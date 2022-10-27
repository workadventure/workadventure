<script lang="ts">
    import { coWebsites } from "../../Stores/CoWebsiteStore";
    import CoWebsiteThumbnail from "./CoWebsiteThumbnailSlot.svelte";

    export let vertical = false;
</script>

{#if $coWebsites.length > 0}
    <div id="cowebsite-thumbnail-container" class:vertical class="tw-z-[350]">
        {#each [...$coWebsites.values()] as coWebsite, index (coWebsite.getId())}
            <CoWebsiteThumbnail {index} {coWebsite} {vertical} />
        {/each}
    </div>
{/if}

<style lang="scss">
    #cowebsite-thumbnail-container {
        pointer-events: all;
        height: 100px;
        display: flex;
        flex-wrap: wrap;
        align-content: flex-end;
        position: absolute;
        bottom: 0px;
        left: 2%;
        overflow: visible;

        &.vertical {
            height: auto !important;
            width: auto !important;
            bottom: auto !important;
            left: auto !important;
            position: relative;
            flex-direction: column;
            align-items: center;
            padding-top: 4px;
            padding-bottom: 4px;
        }
    }
</style>
