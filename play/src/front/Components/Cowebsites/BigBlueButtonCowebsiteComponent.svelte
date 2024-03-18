<script lang="ts">
    import { onMount } from "svelte";
    import { BBBCoWebsite } from "../../WebRtc/CoWebsite/BBBCoWebsite";

    export let actualCowebsite: BBBCoWebsite;

    onMount(() => {
        actualCowebsite.load();
    });
</script>

<!-- svelte-ignore a11y-missing-attribute -->
<iframe src={actualCowebsite.getUrl().toString()} frameborder="0" height="100%" width="100%" />
