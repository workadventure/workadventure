<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { iframeListener } from "../../Api/IframeListener";
    import type { SimpleCoWebsite } from "../../WebRtc/CoWebsite/SimpleCoWebsite";

    let iframeSimpleCowebsite: HTMLIFrameElement;
    interface Props {
        actualCowebsite: SimpleCoWebsite;
        visible: boolean;
        allowApi: boolean;
    }

    let { actualCowebsite, visible, allowApi }: Props = $props();

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

<div class="relative w-full h-full" class:hidden={!visible}>
    <div class="absolute w-full h-full z-0">
        <iframe
            bind:this={iframeSimpleCowebsite}
            src={actualCowebsite.getUrl().toString()}
            frameborder="0"
            allow={actualCowebsite.getAllowPolicy()}
            title="Cowebsite"
            class="bg-white w-full h-full"
        ></iframe>
    </div>
</div>
