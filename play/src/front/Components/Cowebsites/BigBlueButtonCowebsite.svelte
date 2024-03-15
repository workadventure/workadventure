<script>
    import { onMount, onDestroy } from "svelte";
    import { BBBCoWebsite } from "./BBBCoWebsite";

    export let url;
    export let allowApi = true;
    export let allowPolicy;
    export let widthPercent;
    export let closable = true;

    let coWebsiteInstance;

    // Création de l'instance de BBBCoWebsite avec les paramètres dynamiques
    onMount(() => {
        coWebsiteInstance = new BBBCoWebsite(url, allowApi, allowPolicy, widthPercent, closable);
        // Code supplémentaire pour afficher l'instance dans un iframe si nécessaire
    });

    onDestroy(() => {
        // Nettoyage ou libération des ressources si nécessaire
    });
</script>

<!-- <iframe src={url} /> -->
