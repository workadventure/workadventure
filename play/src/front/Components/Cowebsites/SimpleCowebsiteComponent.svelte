<script lang="ts">
    import { onMount } from "svelte";
    import { SimpleCoWebsite } from "../../WebRtc/CoWebsite/SimpleCoWebsite";

    export let actualCowebsite: SimpleCoWebsite;

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
    width="100%"
    height="100%"
/>
