<script lang="ts">
    import { onMount } from "svelte";
    import { BBBCoWebsite } from "../../WebRtc/CoWebsite/BBBCoWebsite";

    export let actualCowebsite: BBBCoWebsite;

    onMount(() => {
        actualCowebsite.load().catch((e) => {
            console.error(e);
        });
    });
</script>

<iframe
    title={actualCowebsite.getId()}
    src={actualCowebsite.getUrl().toString()}
    frameborder="0"
    height="100%"
    width="100%"
/>
