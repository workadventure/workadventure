<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { iframeListener } from "../../Api/IframeListener";
    import { SimpleCoWebsite } from "../../WebRtc/CoWebsite/SimpleCoWebsite";

    export let actualCowebsite: SimpleCoWebsite;
    let iframeSimpleCowebsite: HTMLIFrameElement;
    export let allowApi: boolean;

    onMount(() => {
        if (allowApi) {
            iframeListener.registerIframe(iframeSimpleCowebsite);
        }
    });

    onDestroy(() => {
        if (allowApi) {
            iframeListener.unregisterIframe(iframeSimpleCowebsite);
        }
    });
</script>

<iframe
    bind:this={iframeSimpleCowebsite}
    src={actualCowebsite.getUrl().toString()}
    frameborder="0"
    allow={actualCowebsite.getAllowPolicy()}
    title="Cowebsite"
    class="pixel bg-white h-full w-full z-index-0"
    id="iframe"
/>
