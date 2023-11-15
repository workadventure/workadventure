<script lang="ts">
    import { onMount, onDestroy } from "svelte";

    export let text: string;
    export let rightPosition = "false";
    export let leftPosition = "false";

    let tooltipElement: HTMLDivElement;
    let textElement: HTMLSpanElement;
    let toolTipPosition = "top-tooltip";

    function hide() {
        textElement?.style.setProperty("visibility", "hidden");
    }
    function show() {
        textElement?.style.setProperty("visibility", "visible");
    }

    onMount(() => {
        if (leftPosition === "true") {
            toolTipPosition = "left-tooltip";
        } else if (rightPosition === "true") {
            toolTipPosition = "right-tooltip";
        }
        tooltipElement?.parentElement?.addEventListener("mouseenter", () => show());
        tooltipElement?.parentElement?.addEventListener("mouseleave", () => hide());
    });

    onDestroy(() => {
        tooltipElement?.parentElement?.removeEventListener("mouseenter", () => show());
        tooltipElement?.parentElement?.removeEventListener("mouseleave", () => hide());
    });
</script>

<div bind:this={tooltipElement}>
    <div bind:this={textElement} class="fixed top-[70px] rounded w-40 px-4 py-2 bg-contrast/80 text-white left-1/2 transform -translate-x-1/2 text-center {toolTipPosition}">{text}</div>
</div>
