<script lang="ts">
    import { onDestroy } from "svelte";

    export let minHeight: number;
    export let maxHeight: number;
    export let currentHeight: number;
    export let onResize: (height: number) => void;

    let isDragging = false;
    let startY: number;
    let startHeight: number;

    function startDragging(e: MouseEvent | TouchEvent) {
        isDragging = true;
        startY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
        startHeight = currentHeight;

        document.addEventListener("mousemove", handleDragging);
        document.addEventListener("mouseup", stopDragging);
        document.addEventListener("touchmove", handleDragging);
        document.addEventListener("touchend", stopDragging);
    }

    function handleDragging(e: MouseEvent | TouchEvent) {
        if (!isDragging) return;

        const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
        const deltaY = clientY - startY;
        const newHeight = startHeight + deltaY;
        onResize(Math.min(Math.max(newHeight, minHeight), maxHeight));
    }

    function stopDragging() {
        isDragging = false;
        document.removeEventListener("mousemove", handleDragging);
        document.removeEventListener("mouseup", stopDragging);
        document.removeEventListener("touchmove", handleDragging);
        document.removeEventListener("touchend", stopDragging);
    }

    onDestroy(() => {
        document.removeEventListener("mousemove", handleDragging);
        document.removeEventListener("mouseup", stopDragging);
        document.removeEventListener("touchmove", handleDragging);
        document.removeEventListener("touchend", stopDragging);
    });
</script>

<div
class="drag-handle mx-auto mt-3 w-20 h-1 outline outline-4 outline-contrast bg-white cursor-ns-resize transition-colors rounded-lg"
    on:mousedown={startDragging}
    on:touchstart={startDragging}
/>

<style>
    .drag-handle {
        pointer-events: auto;
    }
</style>
