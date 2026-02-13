<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { listenerWaitingMediaStore } from "../../Stores/MediaStore";
    import Loader from "../../Chat/Components/Loader.svelte";
    import { LL } from "../../../i18n/i18n-svelte";

    // Minimums and maximums for safety
    export let minHeight = 160; // px
    export let maxHeight: number | null = null; // if null, uses viewport height
    export let minIframeWidth = 240; // px
    export let maxIframeWidth: number | null = null; // if null, uses viewport width

    // Initial sizing: match your previous intent
    // You had md:w-[calc(100vw/4)], which gives a width of one quarter of viewport
    // We compute the starting height from that width with a 16:9 ratio
    export let initialWidthFraction = 1 / 4;

    let lineHeight = 0; // px, height of the outer line
    let iframeWidth = 0; // px, computed from lineHeight
    let dragging = false;
    let startY = 0;
    let startH = 0;

    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

    function recomputeFromHeight(h: number) {
        const vh = window.innerHeight;
        const vw = window.innerWidth;

        const hMax = maxHeight ?? Math.round(vh * 0.9);
        const wMax = maxIframeWidth ?? vw;

        lineHeight = clamp(h, minHeight, hMax);

        // Maintain 16:9 for the iframe box
        const targetWidth = Math.round((lineHeight * 16) / 9);
        iframeWidth = clamp(targetWidth, minIframeWidth, wMax);
    }

    function init() {
        const vw = window.innerWidth;
        // Start from the intended width, then derive height
        const startWidth = Math.max(minIframeWidth, Math.round(vw * initialWidthFraction));
        const startHeight = Math.round((startWidth * 9) / 16);
        recomputeFromHeight(startHeight);
    }

    function onPointerMove(e: PointerEvent) {
        if (!dragging) return;
        const dy = e.clientY - startY;
        recomputeFromHeight(startH + dy);
    }

    function endDrag() {
        dragging = false;
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", endDrag);
        window.removeEventListener("pointercancel", endDrag);
    }

    function beginDrag(e: PointerEvent) {
        e.preventDefault();
        dragging = true;
        startY = e.clientY;
        startH = lineHeight;
        (e.target as Element).setPointerCapture?.(e.pointerId);
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", endDrag);
        window.addEventListener("pointercancel", endDrag);
    }

    function onWindowResize() {
        // Keep the same visual height, but ensure it still fits new viewport limits
        recomputeFromHeight(lineHeight);
    }

    onMount(() => {
        init();
        window.addEventListener("resize", onWindowResize);
    });

    onDestroy(() => {
        window.removeEventListener("resize", onWindowResize);
        endDrag();
    });
</script>

<!--
  The outer line stays full width.
  We set its height with an inline style so the bottom bar controls it.
-->
<div class="w-full h-fit flex justify-center pointer-events-auto relative" style="height: {lineHeight}px;">
    <!-- Video box centered, width driven by line height with 16:9 ratio -->
    <div
        class="bg-contrast rounded-lg mx-1 flex justify-center items-center"
        style="
      width: {iframeWidth}px;
      height: {lineHeight}px;
    "
    >
        {#if $listenerWaitingMediaStore != undefined}
            <iframe
                class="w-full h-full rounded-lg border-0"
                src={$listenerWaitingMediaStore}
                title="Embedded video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen
            />
        {:else}
            <Loader text={$LL.mapEditor.properties.listenerMegaphone.waitingSpeaker()} className="m-4" />
        {/if}
    </div>

    <!-- Bottom resize bar spanning the full line -->
    <div
        role="separator"
        aria-label="Resize line height"
        class="absolute flex justify-center items-center left-0 right-0 -bottom-8 h-fit cursor-n-resize z-20"
        on:pointerdown={beginDrag}
    >
        <!-- Visual grip -->
        <div
            class="mx-auto mt-3 mb-3 w-20 h-2 outline outline-4 outline-contrast bg-white cursor-ns-resize transition-colors rounded-lg"
        />
    </div>
</div>
