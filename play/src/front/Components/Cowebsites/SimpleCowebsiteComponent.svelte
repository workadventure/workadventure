<script lang="ts">
    import { onMount } from "svelte";
    import { iframeListener } from "../../Api/IframeListener";
    import { SimpleCoWebsite } from "../../WebRtc/CoWebsite/SimpleCoWebsite";

    export let actualCowebsite: SimpleCoWebsite;
    let iframeSimpleCowebsite: HTMLIFrameElement;
    let allowApi: boolean;

    onMount(() => {
        console.log("SIMPLE COWEBSITE MOUNTED!");
        if (allowApi) {
            iframeListener.registerIframe(iframeSimpleCowebsite);
        }
    });
</script>

<iframe
    src={actualCowebsite.getUrl().toString()}
    frameborder="0"
    allow="fullscreen"
    title="Cowebsite"
    class="pixel bg-white h-full w-full z-index-0"
/>
