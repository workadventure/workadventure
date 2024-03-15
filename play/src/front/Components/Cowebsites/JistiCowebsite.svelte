<script lang="ts">
    import { on } from "events";
    import { onMount } from "svelte";
    import { JitsiCoWebsite } from "../../WebRtc/CoWebsite/JitsiCoWebsite";
    import { GameMapPropertiesListener } from "../../Phaser/Game/GameMapPropertiesListener";

    onMount(() => {
        // jitsiCowebsite = new JitsiCoWebsite(url, allowApi, allowPolicy, widthPercent, closable);
    });

    // Je ne sais pas s'il faut faire cela car dans le game map property listener on a déja un new jitsi qui se créé
</script>

<div class="container">
    <!-- <iframe title= "{coWebsite.getId()}" src={coWebsite.getUrl().toString()} frameborder="0" height="100%" width="100%"></iframe> -->
</div>
