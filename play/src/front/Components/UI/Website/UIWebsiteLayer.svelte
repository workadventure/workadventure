<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import type { UIWebsiteEvent } from "../../../Api/Events/Ui/UIWebsiteEvent";
    import { iframeListener } from "../../../Api/IframeListener";
    import { gameManager } from "../../../Phaser/Game/GameManager";

    export let uiWebsite: UIWebsiteEvent;

    let iframeEl: HTMLIFrameElement;

    $: iframeSrc = new URL(uiWebsite.url, gameManager.getCurrentGameScene().getMapUrl()).toString();
    $: iframeStyles =
        `border: 0; height: ${uiWebsite.size.height}; width: ${uiWebsite.size.width}; visibility: ${
            uiWebsite.visible ? "visible" : "hidden"
        };` +
        (uiWebsite.margin
            ? ` margin: ${uiWebsite.margin.top || 0} ${uiWebsite.margin.right || 0} ${uiWebsite.margin.bottom || 0} ${
                  uiWebsite.margin.left || 0
              };`
            : "");

    onMount(() => {
        if (uiWebsite.allowApi) {
            iframeListener.registerIframe(iframeEl, uiWebsite.id);
        }
    });

    onDestroy(() => {
        if (uiWebsite.allowApi) {
            iframeListener.unregisterIframe(iframeEl);
        }
    });
</script>

<div
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
>
    <iframe
        src={iframeSrc}
        id={`ui-website-${uiWebsite.id}`}
        tabindex="-1"
        title={uiWebsite.url}
        allow={uiWebsite.allowPolicy ?? ""}
        style={iframeStyles}
        bind:this={iframeEl}
    />
</div>

<style lang="scss">
    .layer {
        height: 100%;
        width: 100%;
        display: flex;
        position: absolute;
    }
</style>
