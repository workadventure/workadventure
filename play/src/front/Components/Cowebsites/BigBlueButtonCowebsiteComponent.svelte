<script lang="ts">
    import { onMount } from "svelte";
    import { BBBCoWebsite } from "../../WebRtc/CoWebsite/BBBCoWebsite";

    export let actualCowebsite: BBBCoWebsite;

    // But est de trouver comme dans le jitsi le domaine de la conférence avec je pense l'id mais ausii le screenWakeLock
    // Potentiellement pas beosin d'iframe car dans le load il y a deja cancelable promise, verifier avec le jitsi
    // faire chargcer la fonction load de BBBCoWebsite
    // voir comment tester cela avec le server du AWS
    // voir info dans le cahier pour le fichier BBBcowebsite.

    onMount(() => {
        actualCowebsite.load();
    });
</script>

<!-- svelte-ignore a11y-missing-attribute -->
<iframe src={actualCowebsite.getUrl().toString()} frameborder="0" height="100%" width="100%" />
