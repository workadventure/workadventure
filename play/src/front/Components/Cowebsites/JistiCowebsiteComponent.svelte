<script lang="ts">
    import { onMount } from "svelte";
    import { JitsiCoWebsite } from "../../WebRtc/CoWebsite/JitsiCoWebsite";

    export let actualCowebsite: JitsiCoWebsite;

    onMount(() => {
        actualCowebsite.load().catch((e) => {
            console.error(e);
        });
    });
</script>

<!-- if notLoad -->
<!-- <Loader> -->
<!-- else

    /if -->
<!-- svelte-ignore a11y-missing-attribute -->
<iframe src={actualCowebsite.getUrl().toString()} frameborder="0" height="100%" width="100%" />
