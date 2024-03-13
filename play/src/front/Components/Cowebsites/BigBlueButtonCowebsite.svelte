<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { BBBCoWebsite } from "../../WebRtc/CoWebsite/BBBCoWebsite";
    import meetingIcon from "../images/meeting.svg";
    import { CoWebsite } from "../../WebRtc/CoWebsite/CoWebsite";

    // Définissez les paramètres du composant
    export let coWebsite: CoWebsite;

    let icon: HTMLImageElement;
    let cowebsiteName = "";
    let iconLoaded = false;
    let url = isBBB.getUrl().toString();

    onMount(() => {

    });

    onDestroy(() => {

    });
</script>

<div class="container">
    <iframe src="" frameborder="0"></iframe>
</div>
