<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { UIWebsite } from "../../../Api/Events/Ui/UIWebsite";
    import { iframeListener } from "../../../Api/IframeListener";

    export let uiWebsite: UIWebsite;

    let main: HTMLDivElement;
    const iframe = document.createElement("iframe");
    iframe.id = `ui-website-${uiWebsite.id}`;
    iframe.tabIndex = -1;

    $: {
        iframe.src = uiWebsite.url;
        iframe.title = uiWebsite.url;
        iframe.style.border = "0";
        iframe.allow = uiWebsite.allowPolicy ?? "";
        iframe.style.height = uiWebsite.size.height;
        iframe.style.width = uiWebsite.size.width;
        iframe.style.visibility = uiWebsite.visible ? "visible" : "hidden";
        iframe.style.margin = uiWebsite.margin
            ? `${uiWebsite.margin.top ? uiWebsite.margin.top : "O"} ${
                  uiWebsite.margin.right ? uiWebsite.margin.right : "O"
              } ${uiWebsite.margin.bottom ? uiWebsite.margin.bottom : "O"} ${
                  uiWebsite.margin.left ? uiWebsite.margin.left : "O"
              }`
            : "0";
    }

    onMount(() => {
        main.appendChild(iframe);

        if (uiWebsite.allowApi) {
            iframeListener.registerIframe(iframe);
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
