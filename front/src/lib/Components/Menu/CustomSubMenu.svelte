<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { iframeListener } from "../../Api/IframeListener";

    export let url: string;
    export let allowApi: boolean;

    export let allow: string | undefined;

    let HTMLIframe: HTMLIFrameElement;

    onMount(() => {
        if (allowApi) {
            iframeListener.registerIframe(HTMLIframe);
        }
    });

    onDestroy(() => {
        if (allowApi) {
            iframeListener.unregisterIframe(HTMLIframe);
        }
    });
</script>

<iframe title="customSubMenu" src={url} bind:this={HTMLIframe} {allow} class="border-none w-full h-full m-0" />
