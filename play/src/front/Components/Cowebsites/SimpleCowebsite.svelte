<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { SimpleCoWebsite } from "../../WebRtc/CoWebsite/SimpleCoWebsite";
    import { getGoogleSlidesEmbedUrl } from "@workadventure/shared-utils/src/Application/GoogleWorkSpaceService";

    let id: string;


    onMount(() => {
        simpleCowebsite = new SimpleCoWebsite(id: getId(), url, allowApi, allowPolicy, widthPercent, closable);
    });

    onDestroy(() => {
    });
</script>

<div class="container">
    <!-- <iframe title="{id}" src={getGoogleSlidesEmbedUrl(id)} frameborder="0" height="100%" width="100%"></iframe> -->
</div>
