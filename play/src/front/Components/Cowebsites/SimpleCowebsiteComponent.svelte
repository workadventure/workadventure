<script lang="ts">
    import { SimpleCoWebsite } from "../../WebRtc/CoWebsite/SimpleCoWebsite";

    export let actualCowebsite: SimpleCoWebsite;

    // Mettre la fonction load du SimpleCoWebsite dans le onMount et le unload dans le onDestroy
</script>

<iframe
    src={actualCowebsite.getUrl().toString()}
    frameborder="0"
    width="100%"
    height="100%"
    class="bg-white"
    title="Cowebsite"
/>
