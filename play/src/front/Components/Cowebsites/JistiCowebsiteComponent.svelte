<script lang="ts">
    import { onMount } from "svelte";
    import { JitsiCoWebsite } from "../../WebRtc/CoWebsite/JitsiCoWebsite";
    import { jitsiExternalApiFactory } from "../../WebRtc/JitsiExternalApiFactory";

    export let actualCowebsite: JitsiCoWebsite;
    let options = actualCowebsite.getOptions();
    let domain = actualCowebsite.getDomain();
    let jitsiContainer: HTMLDivElement;

    onMount(() => {
        jitsiExternalApiFactory
            .loadJitsiScript(domain)
            .then(() => {
                options.parentNode = jitsiContainer;
                new window.JitsiMeetExternalAPI(domain, options);
            })
            .catch((e) => {
                console.error(e);
            });
    });
</script>

<div bind:this={jitsiContainer} class="w-full h-full" />
