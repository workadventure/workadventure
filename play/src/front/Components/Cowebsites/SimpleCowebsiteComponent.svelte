<script lang="ts">
    import { onMount } from "svelte";
    import { iframeListener } from "../../Api/IframeListener";
    // import { coWebsiteManager } from "../../Stores/CoWebsiteStore";
    import { SimpleCoWebsite } from "../../WebRtc/CoWebsite/SimpleCoWebsite";

    export let actualCowebsite: SimpleCoWebsite;
    let iframeSimpleCowebsite: HTMLIFrameElement;
    let allowApi: boolean;

    //Dans le onMount uniquement voir pour le délai d'affichage s'ouvre au bout de 2 seconde si iframe n'est pas chargée
    //Mais voir car je ne créé plus d'iframe

    onMount(() => {
        const onloadPromise = new Promise<void>((resolve) => {
            iframeSimpleCowebsite.onload = () => {
                resolve();
            };
        });

        const onTimeoutPromise = new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 2000);
        });

        if (allowApi) {
            iframeListener.registerIframe(iframeSimpleCowebsite);
        }
    });

    // onDestroy(() => {
    //     if (allowApi) {
    //         iframeListener.unregisterIframe(iframeSimpleCowebsite);
    //     }
    // });
</script>

<iframe
    src={actualCowebsite.getUrl().toString()}
    frameborder="0"
    allow="fullscreen"
    title="Cowebsite"
    class="pixel bg-white h-full w-full"
/>
