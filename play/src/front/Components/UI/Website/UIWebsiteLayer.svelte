<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import type { UIWebsiteEvent } from "../../../Api/Events/Ui/UIWebsiteEvent";
    import { iframeListener } from "../../../Api/IframeListener";
    import { gameManager } from "../../../Phaser/Game/GameManager";

    export let uiWebsite: UIWebsiteEvent;
    let main: HTMLDivElement;
    const iframe = document.createElement("iframe");
    iframe.id = `ui-website-${uiWebsite.id}`;
    iframe.tabIndex = -1;
    $: {
        iframe.src = new URL(uiWebsite.url, gameManager.getCurrentGameScene().getMapUrl()).toString();
        iframe.title = uiWebsite.url;
        iframe.style.border = "0";
        iframe.allow = uiWebsite.allowPolicy ?? "";
        iframe.style.height = uiWebsite.size.height;
        iframe.style.width = uiWebsite.size.width;
        iframe.style.visibility = uiWebsite.visible ? "visible" : "hidden";
        if (uiWebsite.margin) {
            iframe.style.margin = `${uiWebsite.margin.top || 0} ${uiWebsite.margin.right || 0} ${
                uiWebsite.margin.bottom || 0
            } ${uiWebsite.margin.left || 0}`;
        }
    }

    onMount(() => {
        main.appendChild(iframe);

        if (uiWebsite.allowApi) {
            iframeListener.registerIframe(iframe, uiWebsite.id);
        }
    });

    onDestroy(() => {
        if (uiWebsite.allowApi) {
            iframeListener.unregisterIframe(iframe);
        }
    });
</script>

<div
    bind:this={main}
    class="layer"
    style:justify-content={uiWebsite.position.horizontal === "middle"
        ? "center"
        : uiWebsite.position.horizontal === "right"
        ? "end"
        : "start"}
    style:align-items={uiWebsite.position.vertical === "middle"
        ? "center"
        : uiWebsite.position.vertical === "bottom"
        ? "end"
        : "top"}
/>

<style lang="scss">
    .layer {
        height: 100%;
        width: 100%;
        display: flex;
        position: absolute;
    }
</style>
