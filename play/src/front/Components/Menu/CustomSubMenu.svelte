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

<iframe title="customSubMenu" src={url} bind:this={HTMLIframe} {allow} />

<style lang="scss">
    iframe {
        border: none;
        height: calc(100% - 56px);
        width: 100%;
        margin: 0;
    }
</style>
