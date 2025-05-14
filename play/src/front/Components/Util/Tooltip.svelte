<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { fly } from "svelte/transition";

    import tooltipArrow from "../images/arrow-top.svg";

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
        console.log("tooltip parent ::::", tooltipElement?.parentElement);
        tooltipElement?.parentElement?.addEventListener("mouseenter", () => show());
        tooltipElement?.parentElement?.addEventListener("mouseleave", () => hide());
    });

    onDestroy(() => {
        tooltipElement?.parentElement?.removeEventListener("mouseenter", () => show());
        tooltipElement?.parentElement?.removeEventListener("mouseleave", () => hide());
    });
</script>

<div bind:this={tooltipElement} in:fly={{ y: 40, duration: 150 }}>
    <div
        bind:this={textElement}
        class="fixed top-[70px] text-sm rounded w-40 px-4 py-2 text-white start-1/2 transform -translate-x-1/2 text-center before:content-[''] before:absolute before:w-full before:h-full before:z-1 before:start-0 before:top-0 before:rounded before:bg-contrast/80 before:backdrop-blur after:content-[''] after:absolute after:z-0 after:w-full after:bg-transparent after:h-full after:-top-4 after:-start-0 transition-all {toolTipPosition}"
    >
        <img
            loading="eager"
            src={tooltipArrow}
            class="content-[''] absolute -top-1 start-0 end-0 m-auto w-2 h-1"
            alt="Sub menu arrow"
            style="visibility: hidden;"
        />
        <span class="relative">
            {text}
        </span>
    </div>
</div>
